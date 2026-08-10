export interface SourceCitation {
  id: string;
  docTitle: string;
  pageNumber: number;
  snippet: string;
  matchText: string;
  category: 'HR' | 'Policy' | 'Tech' | 'Security' | 'Legal';
  confidence: number;
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  usedDocumentSearch?: boolean;
  toolSteps?: string[];
  sources?: SourceCitation[];
  isThinking?: boolean;
}

export interface ConversationSession {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
}

export const KNOWLEDGE_BASE: Record<string, { category: 'HR' | 'Policy' | 'Tech' | 'Security' | 'Legal'; pages: { page: number; content: string }[] }> = {
  "Employee Handbook & Leave Policy": {
    category: "HR",
    pages: [
      { page: 12, content: "Employees are entitled to 20 business days of paid personal time off (PTO) annually. Unused vacation days up to 5 days can roll over to the next calendar year. Remote work options require approval from team leads." },
      { page: 14, content: "Parental leave covers 16 weeks of fully paid leave for primary caregivers and 8 weeks for secondary caregivers, eligible after 90 days of employment." },
      { page: 22, content: "Sick leave provides 10 dedicated paid days per year. Medical certificates are required for consecutive absences exceeding 3 business days." }
    ]
  },
  "Enterprise Security Guidelines v4.2": {
    category: "Security",
    pages: [
      { page: 5, content: "Multi-factor authentication (MFA) via WebAuthn or hardware security keys is strictly mandatory for all internal services, VPNs, and cloud administrative portals." },
      { page: 18, content: "All production data must be encrypted at rest using AES-256 and in transit via TLS 1.3. API tokens expire automatically after 30 days of inactivity." },
      { page: 31, content: "Zero-trust network architecture requires device integrity verification and continuous authorization before granting access to codebase repositories." }
    ]
  },
  "Agilo Architecture & API Specifications": {
    category: "Tech",
    pages: [
      { page: 3, content: "Agilo AI utilizes a multi-stage Hybrid RAG system combining dense vector embeddings (OpenAI text-embedding-3-large) with BM25 sparse keyword ranking across PostgreSQL vector tables." },
      { page: 9, content: "Tool execution requests route through isolated sandboxed microservices with fine-grained RBAC controls, maintaining low latency response (<250ms TTFT)." },
      { page: 15, content: "Context compression algorithms automatically summarize prior session turns, maintaining high precision across 128k token context windows." }
    ]
  },
  "Client Requirement Specifications 2026": {
    category: "Legal",
    pages: [
      { page: 7, content: "Service Level Agreement (SLA) guarantees 99.99% uptime for Enterprise tiers, supported by multi-region automated failover and 24/7 incident response." },
      { page: 11, content: "Data retention policies mandate complete data sanitization within 30 days upon contract termination, with audited compliance reports." }
    ]
  }
};

export const INITIAL_CONVERSATIONS: ConversationSession[] = [
  {
    id: "session-1",
    title: "Employee Leave Policy",
    updatedAt: "2m ago",
    messages: [
      {
        id: "msg-1",
        sender: "user",
        content: "What is our company's policy on annual PTO roll-over and paid parental leave?",
        timestamp: "10:14 AM"
      },
      {
        id: "msg-2",
        sender: "assistant",
        content: "Based on the **Employee Handbook & Leave Policy (Page 12 & 14)**:\n\n1. **Annual PTO Roll-over**: Employees receive 20 days of paid personal time off per year. You can roll over up to **5 unused vacation days** into the following calendar year.\n2. **Parental Leave**: Primary caregivers are eligible for **16 weeks of fully paid leave**, while secondary caregivers receive **8 weeks** after completing 90 days of employment.",
        timestamp: "10:14 AM",
        usedDocumentSearch: true,
        toolSteps: ["Analyzing request...", "🔎 Searching knowledge...", "✓ 2 Sources found"],
        sources: [
          {
            id: "src-1",
            docTitle: "Employee Handbook & Leave Policy",
            pageNumber: 12,
            snippet: "Employees are entitled to 20 business days of paid personal time off (PTO) annually. Unused vacation days up to 5 days can roll over to the next calendar year.",
            matchText: "Unused vacation days up to 5 days can roll over to the next calendar year.",
            category: "HR",
            confidence: 0.96
          },
          {
            id: "src-2",
            docTitle: "Employee Handbook & Leave Policy",
            pageNumber: 14,
            snippet: "Parental leave covers 16 weeks of fully paid leave for primary caregivers and 8 weeks for secondary caregivers, eligible after 90 days of employment.",
            matchText: "16 weeks of fully paid leave for primary caregivers",
            category: "HR",
            confidence: 0.92
          }
        ]
      }
    ]
  },
  {
    id: "session-2",
    title: "Project Documentation",
    updatedAt: "15m ago",
    messages: [
      {
        id: "msg-201",
        sender: "user",
        content: "How does Agilo AI process vector retrieval for RAG queries?",
        timestamp: "09:58 AM"
      },
      {
        id: "msg-202",
        sender: "assistant",
        content: "Agilo AI employs a **Hybrid RAG architecture** combining dense vector embeddings with BM25 keyword matching for optimal retrieval accuracy.\n\nKey pipeline stages:\n- **Dense Search**: Embeddings via `text-embedding-3-large` stored in pgvector.\n- **Sparse Search**: BM25 keyword scoring for exact entity matching.\n- **Re-ranking**: Cross-encoder re-ranking for top context chunks under 250ms TTFT.",
        timestamp: "09:59 AM",
        usedDocumentSearch: true,
        toolSteps: ["Analyzing request...", "🔎 Searching knowledge...", "✓ Source matched"],
        sources: [
          {
            id: "src-201",
            docTitle: "Agilo Architecture & API Specifications",
            pageNumber: 3,
            snippet: "Agilo AI utilizes a multi-stage Hybrid RAG system combining dense vector embeddings with BM25 sparse keyword ranking...",
            matchText: "multi-stage Hybrid RAG system combining dense vector embeddings",
            category: "Tech",
            confidence: 0.98
          }
        ]
      }
    ]
  },
  {
    id: "session-3",
    title: "Client Requirements",
    updatedAt: "1h ago",
    messages: [
      {
        id: "msg-301",
        sender: "user",
        content: "What uptime SLA do we offer to Enterprise clients?",
        timestamp: "09:00 AM"
      },
      {
        id: "msg-302",
        sender: "assistant",
        content: "According to our **Client Requirement Specifications 2026 (Page 7)**, we guarantee a **99.99% uptime SLA** for Enterprise tier customers, backed by automated multi-region failover and 24/7 incident response support.",
        timestamp: "09:01 AM",
        usedDocumentSearch: true,
        toolSteps: ["Analyzing request...", "🔎 Searching knowledge...", "✓ SLA verified"],
        sources: [
          {
            id: "src-301",
            docTitle: "Client Requirement Specifications 2026",
            pageNumber: 7,
            snippet: "Service Level Agreement (SLA) guarantees 99.99% uptime for Enterprise tiers, supported by multi-region automated failover...",
            matchText: "guarantees 99.99% uptime for Enterprise tiers",
            category: "Legal",
            confidence: 0.99
          }
        ]
      }
    ]
  },
  {
    id: "session-4",
    title: "Security Guidelines",
    updatedAt: "3h ago",
    messages: [
      {
        id: "msg-401",
        sender: "user",
        content: "What are our encryption standards for production data?",
        timestamp: "07:15 AM"
      },
      {
        id: "msg-402",
        sender: "assistant",
        content: "Under **Enterprise Security Guidelines v4.2 (Page 18)**:\n- **At Rest**: AES-256 hardware-level encryption.\n- **In Transit**: TLS 1.3 enforced for all APIs and internal services.\n- **API Keys**: Auto-expire after 30 days of inactivity.",
        timestamp: "07:15 AM",
        usedDocumentSearch: true,
        toolSteps: ["Analyzing request...", "🔎 Searching knowledge...", "✓ Security doc verified"],
        sources: [
          {
            id: "src-401",
            docTitle: "Enterprise Security Guidelines v4.2",
            pageNumber: 18,
            snippet: "All production data must be encrypted at rest using AES-256 and in transit via TLS 1.3.",
            matchText: "encrypted at rest using AES-256 and in transit via TLS 1.3",
            category: "Security",
            confidence: 0.97
          }
        ]
      }
    ]
  }
];

import { askQuestion } from './api';

export async function processUserQuery(
  userQuery: string,
  onStepUpdate?: (step: string) => void,
  token?: string,
  sessionId?: number | null
): Promise<{ content: string; usedDocumentSearch: boolean; toolSteps: string[]; sources?: SourceCitation[] }> {
  const queryLower = userQuery.toLowerCase();
  const isDirectGreeting = /^(hi|hello|hey|greetings|who are you|what can you do|help)$/i.test(queryLower.trim());

  const toolSteps: string[] = ['Analyzing request...'];
  if (onStepUpdate) onStepUpdate('Analyzing request...');

  if (!isDirectGreeting) {
    toolSteps.push('🔎 Searching knowledge base...');
    if (onStepUpdate) onStepUpdate('🔎 Searching knowledge base...');
  }

  try {
    if (isDirectGreeting) {
      toolSteps.push('🧠 Answered Directly');
      if (onStepUpdate) onStepUpdate('🧠 Answered Directly');

      return {
        content: `Hello! I'm **Agilo AI**, your enterprise knowledge assistant. I can search through company policies, architecture specifications, HR documentation, and security guidelines to answer your questions with verified citations.\n\nHow can I assist your workflow today?`,
        usedDocumentSearch: false,
        toolSteps,
      };
    }

    const response = await askQuestion(userQuery, token, sessionId);

    toolSteps.push(`✓ ${response.sources.length} Sources found`);
    if (onStepUpdate) onStepUpdate(`✓ ${response.sources.length} Sources found`);

    return {
      content: response.answer,
      usedDocumentSearch: response.sources.length > 0,
      toolSteps,
      sources: response.sources.map((src, index) => ({
        id: `src-${Date.now()}-${index + 1}`,
        docTitle: src.document_name,
        pageNumber: src.page_number ?? 1,
        snippet: response.answer,
        matchText: response.answer,
        category: 'Tech',
        confidence: 0.92,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reach the backend';
    toolSteps.push(`⚠️ ${message}`);
    if (onStepUpdate) onStepUpdate(`⚠️ ${message}`);

    return {
      content: `I couldn't reach the backend right now. Please make sure the API server is running at http://127.0.0.1:8000 and try again.\n\n${message}`,
      usedDocumentSearch: false,
      toolSteps,
    };
  }
}
