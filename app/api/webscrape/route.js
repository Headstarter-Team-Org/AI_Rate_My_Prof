import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { ChatOpenAI } from "@langchain/openai";
import { FireCrawlLoader } from "@langchain/community/document_loaders/web/firecrawl";

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
      temperature: 0
    });

    for (const currURL of urls) {
      try {
        const loader = new FireCrawlLoader({
          url: currURL, // The URL to scrape
          apiKey: process.env.FIRECRAWL_API_KEY, // Optional, defaults to `FIRECRAWL_API_KEY` in your env.
          mode: "scrape",
        });

        const docs = await loader.load();
        if (docs[0].metadata.pageStatusCode != 200) {
          console.error(`Failed to fetch data from URL: ${currURL}`);
          continue;
        }
    
        // Query the chain to extract professor information
        const query = "Extract the professor's name, subject, rating, and review.";
        //const extraction = await chain.call({ question: query });
        const aiMsg = await llm.invoke([
          [
            "system",
            query,
          ],
          ["human", docs[0].pageContent],
        ]);
        console.log(aiMsg.content)
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
          console.error(`Failed to scrape data from URL: ${currURL}. The data might be incomplete or invalid.`);
        }
      } catch (error) {
        console.error(`Error occurred while processing URL: ${currURL}`, error.message);
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
