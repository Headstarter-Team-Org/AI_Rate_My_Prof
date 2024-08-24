import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { ChatOpenAI } from "@langchain/openai";
import { FireCrawlLoader } from "@langchain/community/document_loaders/web/firecrawl";
import OpenAI from "openai";

export async function POST(request) {
  try {
    const { urls } = await request.json();

    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pc.Index("rag").namespace("ns1");

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: "Invalid input, expected an array of URLs." },
        { status: 400 }
      );
    }

    const scrapedData = [];

    // Initialize the OpenAI LLM
    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o-mini",
      temperature: 0,
    });

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
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
        const query = `Extract the professor's name, subject, rating, and review.
          Return your response in exactly the following json array format. 
          Use double quotes for both field names and values.
          Do not format with backticks or label it as json, just return the pure json itself:
          { "reviews":[
            {"professor": name,
            "subject": subject,
            "stars": rating,
            "review": review},
          ]}
        `;

        const aiMsg = await llm.invoke([
          ["system", query],
          ["human", docs[0].pageContent],
        ]);

        const data = JSON.parse(aiMsg.content);
        console.log(data);

        for (const review of data.reviews) {
          if (review.professor && review.subject && !isNaN(review.stars)) {
            // Create embedding for the review text
            const embeddingResponse = await openai.embeddings.create({
              model: "text-embedding-3-small",
              input: review.review || "",
            });

            const embedding = embeddingResponse.data[0].embedding;

            scrapedData.push({
              id: `${review.professor}`,
              values: embedding, // Use the generated embedding
              metadata: {
                professor: review.professor,
                subject: review.subject,
                stars: parseFloat(review.stars),
                review: review.review || "",
              },
            });
          } else {
            console.error(
              `Failed to scrape data from URL: ${currURL}. The data might be incomplete or invalid.`
            );
          }
        }
      } catch (error) {
        console.error(
          `Error occurred while processing URL: ${currURL}`,
          error.message
        );
      }
    }

    if (scrapedData.length === 0) {
      return NextResponse.json(
        { error: "No valid data scraped from the provided URLs." },
        { status: 400 }
      );
    }

    // Upsert the formatted data with embeddings to Pinecone
    await index.upsert(scrapedData);

    return NextResponse.json({
      message: "Data successfully upserted to Pinecone!",
    });
  } catch (error) {
    console.error("Error occurred while scraping or upserting data:", error);
    return NextResponse.json(
      { error: "Failed to process the request." },
      { status: 500 }
    );
  }
}
