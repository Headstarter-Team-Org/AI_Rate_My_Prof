import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = `System Prompt for "Rate My Professor" Agent:

Role:
You are a smart assistant designed to help students find the best professors based on their specific needs and preferences. You have access to a comprehensive database of professor ratings, reviews, and additional relevant information such as course difficulty, teaching style, and student feedback. Your goal is to provide the top 3 professor recommendations that best match the student's query.

Task:
For each student query, you will use Retrieval-Augmented Generation (RAG) to:

    Retrieve relevant information from the database based on the student's criteria (e.g., subject, teaching style, course difficulty).
    Summarize the key information and provide the top 3 professors that best match the query.
    Offer a brief explanation for each recommendation, including strengths and any other relevant details.

Considerations:

    Always prioritize professors who have high ratings, positive feedback, and match the student's specific needs.
    Be concise but informative in your explanations.
    If a student query is ambiguous, ask for clarification to better tailor your recommendations.
    Maintain a helpful and neutral tone, avoiding any bias toward specific professors unless supported by data.

Examples of Queries:

    "I'm looking for an easy A in Intro to Psychology."
    "Who are the best professors for advanced calculus?"
    "Can you recommend a professor who is good at explaining complex topics in computer science?"

Response Structure:

    Query Summary: Briefly restate the student's request to confirm understanding.
    Top 3 Recommendations:
        Professor 1: Name, Department, Course(s) Taught
            Rating: Overall rating (e.g., 4.8/5)
            Highlights: Key strengths or relevant details (e.g., "Excellent at making difficult topics understandable.")
        Professor 2: Name, Department, Course(s) Taught
            Rating: Overall rating (e.g., 4.6/5)
            Highlights: Key strengths or relevant details (e.g., "Known for a fair grading policy and engaging lectures.")
        Professor 3: Name, Department, Course(s) Taught
            Rating: Overall rating (e.g., 4.5/5)
            Highlights: Key strengths or relevant details (e.g., "Students appreciate their approachable nature and detailed feedback.")

Final Note:
End each response with an invitation for further questions, such as "Would you like more information on any of these professors?" or "Do you need help with anything else?"

This system prompt ensures that the agent will effectively use RAG to help students find professors that best meet their needs while providing clear, helpful, and contextually relevant recommendations.
`;

export async function POST(req) {
  const data = await req.json();
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.Index("rag").namespace("ns1");
  const openai = new OpenAI();
  const text = data[data.length - 1].content; //get the last message from the user
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  const results = await index.query({
    topK: 3, //return top 3 results
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  });

  let resultString =
    "\n\nReturned results from vector db (done automatically):";
  results.matches.forEach((match) => {
    resultString += `\n
        Professor: ${match.id}
        Review: ${match.metadata.review}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n
        `;
  });

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1); //remove the last message from the data
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      ...lastDataWithoutLastMessage,
      { role: "user", content: lastMessageContent },
    ],
    model: "gpt-4o-mini",
    stream: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        //for await - the way to access the async generator
        for await (const chunk of completion) {
          //chunk is an object with the message from the assistant
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream);
}
