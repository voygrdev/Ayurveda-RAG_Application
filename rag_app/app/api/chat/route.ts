import { NextResponse } from 'next/server';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OllamaEmbeddings } from '@langchain/ollama';
import { supabase } from '@/lib/client';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

interface RequestBody {
  message: string;
  chatHistory: { role: string; content: string }[];
}

async function performVectorSearch(query: string) {
  try {
    const embeddings = new OllamaEmbeddings({
      model: "nomic-embed-text",
      baseUrl: "http://localhost:11434"
    });

    const allopathicVectorStore = new SupabaseVectorStore(embeddings, {
      client: supabase,
      tableName: 'allopathic',
      queryName: 'match_allopathic_medicines',
      filter: {},
    });

    const ayurvedicVectorStore = new SupabaseVectorStore(embeddings, {
      client: supabase,
      tableName: 'ayurvedic',
      queryName: 'match_ayurvedic_medicines',
      filter: {},
    });

    const [allopathicResults, ayurvedicResults] = await Promise.all([
      allopathicVectorStore.similaritySearch(query, 3),
      ayurvedicVectorStore.similaritySearch(query, 3)
    ]);

    return {
      allopathic: allopathicResults,
      ayurvedic: ayurvedicResults
    };
  } catch (error) {
    console.error('Error in vector search:', error);
    throw error;
  }
}

const TEMPLATE = `You are MedBot, a medical assistant knowledgeable in both allopathic and ayurvedic medicine.
Based on the following context and chat history, provide a helpful, accurate, and comprehensive response.The respone
should be point wised not a whole paragraph

Relevant information from medical database:
Allopathic Medicines:
{allopathicContext}

Ayurvedic Medicines:
{ayurvedicContext}

Previous conversation:
{chatHistory}

Current question: {question}

Please provide a response that:
1. Is accurate and based on the provided medical information
2. Compares allopathic and ayurvedic options when relevant
3. Includes important disclaimers when necessary
4. Suggests consulting healthcare professionals for serious conditions
5. Maintains a professional yet friendly tone

Response:`;

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const { message, chatHistory } = body;

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start processing in the background
    (async () => {
      try {
        const searchResults = await performVectorSearch(message);

        const allopathicContext = searchResults.allopathic
          .map(doc => doc.pageContent)
          .join('\n');
        const ayurvedicContext = searchResults.ayurvedic
          .map(doc => doc.pageContent)
          .join('\n');

        const formattedHistory = chatHistory
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');

        const prompt = PromptTemplate.fromTemplate(TEMPLATE);

        const model = new ChatOllama({
          baseUrl: "http://localhost:11434",
          model: "qwen2.5:1.5b",
          temperature: 0.5,
        });

        const stream = await model.stream(await prompt.format({
          question: message,
          allopathicContext,
          ayurvedicContext,
          chatHistory: formattedHistory,
        }));

        for await (const chunk of stream) {
          const data = {
            data: chunk.content,
          };
          await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        console.error('Streaming error:', error);
        const errorMessage = {
          error: 'An error occurred during streaming'
        };
        await writer.write(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      {
        error: 'An error occurred processing your request'
      },
      { status: 500 }
    );
  }
}