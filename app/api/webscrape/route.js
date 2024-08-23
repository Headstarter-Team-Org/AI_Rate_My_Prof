import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import cheerio from "cheerio";

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

export async function POST(request) {
  try {
    const { urls } = await request.json(); // Expecting a JSON body with an array of URLs

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: "Invalid input, expected an array of URLs." }, { status: 400 });
    }

    const scrapedData = [];
    
    // Loop through each URL and scrape the data
    for (const url of urls) {
      const { data } = await fetch(url);
      const $ = cheerio.load(data);
      
      // Extract the relevant data based on the structure of Rate My Professors
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
      }
    }

    // Format the data for Pinecone
    const formattedData = scrapedData.map((entry, index) => ({
      id: `prof-${index}-${entry.professor.replace(/\s+/g, '-').toLowerCase()}`,
      values: [entry.stars], // Assuming Pinecone expects an array of numeric values
      metadata: {
        professor: entry.professor,
        subject: entry.subject,
        review: entry.review
      }
    }));

    // Upsert the data to Pinecone
    await pinecone.upsert({
      indexName: "rag", // Replace with your actual index name
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
