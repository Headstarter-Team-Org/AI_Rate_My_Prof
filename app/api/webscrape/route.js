import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import * as cheerio from 'cheerio';
import { ChatOpenAI } from "@langchain/openai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { UnstructuredLoader } from "@langchain/community/document_loaders/fs/unstructured";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export async function POST(request) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: "Invalid input, expected an array of URLs." }, { status: 400 });
    }

    const scrapedData = [];

    // Initialize the OpenAI LLM
    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o-mini",
    });

    // MemoryVectorStore is used for storing document embeddings in-memory
    const vectorStore = new MemoryVectorStore();

    // Set up createStuffDocumentsChain
    const chain = await createStuffDocumentsChain({
      retriever: vectorStore.asRetriever(),
      llm: llm,
    });

    for (const url of urls) {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          console.error(`Failed to fetch data from URL: ${url}`);
          continue;
        }

        const htmlContent = await response.text();
        const $ = cheerio.load(htmlContent);

        // Use LangChain's HTMLLoader to process the HTML content
        const loader = new UnstructuredLoader(htmlContent);
        const documents = await loader.load();

        // Store documents in vector store
        await vectorStore.addDocuments(documents);

        // Query the chain to extract professor information
        const query = "Extract the professor's name, subject, rating, and review.";
        const extraction = await chain.call({ question: query });

        // Assuming the extraction includes the professor's details in JSON format
        const data = JSON.parse(extraction.text);

        if (data.professor && data.subject && !isNaN(data.stars)) {
          scrapedData.push({
            professor: data.professor,
            subject: data.subject,
            stars: parseFloat(data.stars),
            review: data.review || "",
          });
        } else {
          console.error(`Failed to scrape data from URL: ${url}. The data might be incomplete or invalid.`);
        }
      } catch (error) {
        console.error(`Error occurred while processing URL: ${url}`, error.message);
      }
    }

    if (scrapedData.length === 0) {
      return NextResponse.json({ error: "No valid data scraped from the provided URLs." }, { status: 400 });
    }

    const formattedData = scrapedData.map((entry, index) => ({
      id: `prof-${index}-${entry.professor.replace(/\s+/g, '-').toLowerCase()}`,
      values: [entry.stars],
      metadata: {
        professor: entry.professor,
        subject: entry.subject,
        review: entry.review,
      },
    }));

    await pinecone.upsert({
      indexName: "rag",
      upsertRequest: {
        vectors: formattedData,
      },
    });

    return NextResponse.json({ message: "Data successfully upserted to Pinecone!" });

  } catch (error) {
    console.error("Error occurred while scraping or upserting data:", error);
    return NextResponse.json({ error: "Failed to process the request." }, { status: 500 });
  }
}
