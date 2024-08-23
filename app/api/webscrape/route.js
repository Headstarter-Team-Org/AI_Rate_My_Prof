import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import * as cheerio from 'cheerio';

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
    
    for (const url of urls) {
      try {
        const response = await fetch(url);

        if (!response || !response.data) {
          console.error(`Failed to fetch data from URL: ${url}`);
          continue;
        }

        const $ = cheerio.load(response.data);
        
        // Adjust these selectors based on the actual HTML structure of the page
        const professorName = $("h1.professor-name").text().trim();
        const subject = $("div.subject").text().trim();
        const stars = parseFloat($("div.rating-number").text().trim());
        const review = $("p.comments").text().trim();

        if (professorName && subject && !isNaN(stars)) {
          scrapedData.push({
            professor: professorName,
            subject: subject,
            stars: stars,
            review: review
          });
        } else {
          console.error(`Failed to scrape data from URL: ${url}. Check the selectors or the page structure.`);
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
        review: entry.review
      }
    }));

    await pinecone.upsert({
      indexName: "your-index-name", // Replace with your actual index name
      upsertRequest: {
        vectors: formattedData
      }
    });

    return NextResponse.json({ message: "Data successfully upserted to Pinecone!" });

  } catch (error) {
    console.error("Error occurred while scraping or upserting data:", error);
    return NextResponse.json({ error: "Failed to process the request." }, { status: 500 });
  }
}
