# Decision Tree Agent

An AI Agent Architectural Suitability Evaluator built with the [ADK TypeScript SDK](https://github.com/google/adk). This multi-agent system evaluates project descriptions to determine their suitability for AI agent architectures, identifies anti-patterns, applies decision-tree logic, and generates comprehensive architectural recommendations.

## Prerequisites

- **Node.js 24 or higher** (Required by ADK TypeScript SDK)
- **npm** (comes with Node.js)
- **Docker and Docker Compose** (for MailHog testing)
- A Google Cloud Project (for Vertex AI) or a Gemini API Key.
- **IAM Requirement:** If using Google Cloud Project, ensure the Compute Engine default service account (or the service account you are using) has the **Vertex AI User** role.

## Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd decision-tree-agent
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   Copy the example environment file and fill in your credentials:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and provide your configuration:
   - `GEMINI_MODEL_NAME`: The model to use (e.g., `gemini-3.1-flash-lite-preview`).
   - Provide `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` (e.g., `us-central1`), and set `GOOGLE_GENAI_USE_VERTEXAI=TRUE` if using Vertex AI.

## Running the Agent

The agent can be executed in different modes using the ADK DevTools.

### 1. Web Mode (Recommended)

This mode provides a local web UI to interact with the agent, visualize state, and debug the multi-agent workflow.

```bash
npm run web
```

Once started, the UI is typically accessible at `http://127.0.0.1:8000`.

### 2. CLI Mode

Run the agent directly in your terminal for a text-based interaction.

```bash
npm run cli
```

### 3. API Server Mode

Start a local API server to interact with the agent programmatically.

```bash
npm run serve
```

Once started, the server is typically accessible at `http://127.0.0.1:8000`.

## Testing with MailHog

MailHog provides a local SMTP server and web interface to capture and view test emails without sending them to real addresses.

1. **Launch Docker Desktop** (or ensure the Docker daemon is running).

2. **Start MailHog:**

   ```bash
   docker compose up -d
   ```

3. **Access the Web UI:**

   Open `http://localhost:8025` in your browser to view captured emails.

4. **SMTP Configuration:**

   Ensure your application is configured to connect to MailHog. Copy the following SMTP settings from `.env.example` to your `.env` file (these are the defaults for MailHog):

   ```env
   # SMTP Settings (MailHog)
   SMTP_HOST="localhost"
   SMTP_PORT=1025
   SMTP_USER=""
   SMTP_PASS=""
   SMTP_FROM="no-reply@test.local"
   ADMIN_EMAIL="admin@test.local"
   ```

## Agent Architecture

This project uses a modular multi-agent architecture:

```mermaid
graph TD
    User([User]) --> PEA[ProjectEvaluationAgent]
    PEA --> Reset[prepare_evaluation tool]
    Reset --> SEA[SequentialEvaluationAgent]

    subgraph Pipeline [Sequential Pipeline]
        SEA --> PA[ProjectAgent]
        PA --> APA[AntiPatternsAgent]
        APA --> DTA[DecisionTreeAgent]
        DTA --> RA[RecommendationAgent]
        RA --> PARA[ParallelAuditReportAgent]

        subgraph Parallel Operations
            PARA --> ATA[AuditTrailAgent]
            PARA --> CSA[CloudStorageAgent]
        end

        ATA --> MA[MergerAgent]
        CSA --> MA
        MA --> EA[EmailAgent]
    end

    EA --> Final([Final JSON Report])
```

- **Root Orchestrator (`ProjectEvaluationAgent`)**: Manages the user interaction lifecycle and validates initial project descriptions.
- **Sequential Pipeline (`SequentialEvaluationAgent`)**: A series of specialized sub-agents that process the evaluation in order:
  - **ProjectAgent**: Breaks down the project components.
  - **AntiPatternsAgent**: Identifies potential architectural pitfalls.
  - **DecisionTreeAgent**: Applies core logic to determine agent suitability.
  - **RecommendationAgent**: Generates the final architectural strategy.
  - **ParallelAuditReportAgent**: Orchestrates concurrent execution of:
    - **AuditTrailAgent**: Validates and formats evaluation session data.
    - **CloudStorageAgent**: Manages secure generation and upload of reports to cloud storage.
  - **MergerAgent**: Consolidates all outputs into a final JSON report.
  - **EmailAgent**: Sends the finalized JSON report to the administrator via a configured SMTP server.

## Advanced Features: Callbacks

The ADK SDK's callback functionality is heavily utilized for observability and robustness:

- **Performance Tracking**: Agents implement `agentStartCallback` and `agentEndCallback` to measure and log their execution latency.
- **Validation Retry Logic**: The system uses `AfterToolCallback` specifically for complex extraction agents (like `ProjectAgent` and `DecisionAgent`). This callback intercepts the LLM's tool calls and tracks the number of validation attempts. If an agent struggles to extract valid data within a defined maximum number of iterations, the callback forces the LLM to terminate with a `FATAL_ERROR` and proceed with the best data found so far, preventing infinite generation loops.

## Available Scripts

- `npm run build`: Compiles the TypeScript code to JavaScript in the `dist/` directory.
- `npm run cli`: Builds and executes the agent in CLI mode.
- `npm run web`: Builds and executes the agent in Web mode via ADK DevTools.
- `npm run serve`: Starts the ADK DevTools API server.
- `npm run test`: Runs the Jest test suite.
- `npm run lint`: Checks for code style and potential errors.
- `npm run lint:fix`: Automatically fixes fixable linting errors.
- `npm run format`: Automatically formats the codebase using Prettier.

## License

ISC
