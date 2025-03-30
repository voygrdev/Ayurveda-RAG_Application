import { NextResponse } from 'next/server';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OllamaEmbeddings } from '@langchain/ollama';
import { supabase } from '@/lib/client';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

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

    // Initialize vector stores with proper configuration
    const allopathicVectorStore = new SupabaseVectorStore(embeddings, {
      client: supabase,
      tableName: 'allopathic',
      queryName: 'match_allopathic_medicines',
      filter: {}, // Optional filter
    });

    const ayurvedicVectorStore = new SupabaseVectorStore(embeddings, {
      client: supabase,
      tableName: 'ayurvedic',
      queryName: 'match_ayurvedic_medicines',
      filter: {}, // Optional filter
    });

    // Perform similarity search on both tables
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
Based on the following context and chat history, provide a helpful, accurate, and comprehensive response.

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

    // Perform vector similarity search
    const searchResults = await performVectorSearch(message);

    // Format the context from search results
    const allopathicContext = searchResults.allopathic
      .map(doc => doc.pageContent)
      .join('\n');
    const ayurvedicContext = searchResults.ayurvedic
      .map(doc => doc.pageContent)
      .join('\n');

    // Format chat history
    const formattedHistory = chatHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Create the prompt template
    const prompt = PromptTemplate.fromTemplate(TEMPLATE);

    // Initialize the Ollama chat model
    const model = new ChatOllama({
      baseUrl: "http://localhost:11434",
      model: "qwen2.5:1.5b",
      temperature: 0.7,
    });

    // Create the runnable sequence
    const chain = RunnableSequence.from([
      {
        question: (input: string) => input,
        allopathicContext: () => allopathicContext,
        ayurvedicContext: () => ayurvedicContext,
        chatHistory: () => formattedHistory,
      },
      prompt,
      model,
      new StringOutputParser(),
    ]);

    // Generate the response
    const response = await chain.invoke(message);

    return NextResponse.json({
      role: 'assistant',
      content: response,
    });

  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      {
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again.'
      },
      { status: 500 }
    );
  }
}
