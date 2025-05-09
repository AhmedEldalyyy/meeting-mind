# Meeting Mind - An Hour Long Meeting Analyzed in Under 30 Seconds

MeetingMind is an AI-powered meeting assistant that helps you capture, analyze, and act on your meeting insights effortlessly. This project is built with Next.js, Groq Whisper for fast transcription, and Google's Gemini API for analysis to help you understand your meetings better.

## Demo

Check out this demo video to see MeetingMind in action:

https://github.com/user-attachments/assets/50a9de7a-b24f-4167-9526-4e112b1d24f8

## Features

- Audio recording and file upload
- Fast AI-powered transcription using Groq Whisper
- Intelligent analysis using Gemini API to extract:
  - Tasks
  - Decisions
  - Questions
  - Insights
  - Deadlines
  - Attendees
  - Follow-ups
  - Risks
  - Agenda

## Getting Started

### Prerequisites

- Node.js 14.x or later
- npm or yarn
- Git (for cloning the repository)
- Groq API key for transcription
- Gemini API key for analysis

### Caution

⚠️ **Important:** Groq Whisper used for transcription currently supports files up to 25 MB only. There is a compression step in the process to reduce the file size to a manageable level. If your audio file is larger than 25 MB, you will need to compress it before uploading. This limitation may affect the processing of longer meetings or high-quality audio recordings.

To compress your audio files further, you can use the built-in compression feature which will:
- Convert to mono audio
- Reduce sample rate
- Optimize bitrate
- Convert to MP3 format

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/meetingmind.git
   cd meetingmind
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add your API keys:
     ```
     GEMINI_API_KEY=your_gemini_api_key
     GROQ_API_KEY=your_groq_api_key
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Docker Setup
Docker compose setup will run three containers of Sqlite, Langflow, Postgres. Postgres is used to store the Langflow data.

1. Use the command to run the containers.
```bash
docker compose up
```

2. Langflow setup
   
  - Upload the flow provided in the repo at `utils/langflow_flow/Meeting Mind.json`
  - Note the URL of your LangFlow server
  - Paste the url on .env.local file

3. Build the application image
```bash
docker build -t YOUR-IMAGE-NAME .
```
4. Run the application
```bash
docker run -p 3000:3000 YOUR-IMAGE-NAME
```

## Usage

1. Navigate to the dashboard page.
2. Upload an audio file.
3. Wait for the AI to process and analyze the meeting.
4. Review the extracted information in the Dashboard.

## Project Structure

- `app/`: Contains the main application code
  - `components/`: Reusable React components
  - `api/`: API routes for server-side functionality
  - `dashboard/`: Dashboard page component
  - `page.tsx`: Home page component
- `public/`: Static assets
- `prisma/`: Database schema and migrations
- `utils/`: Utility functions and configurations
- `lib/`: Shared libraries and modules

## Technologies Used

- Langflow: For AI workflow management
- Next.js: React framework for building the web application
- React: JavaScript library for building user interfaces
- Tailwind CSS: Utility-first CSS framework
- Framer Motion: Animation library for React
- Axios: Promise-based HTTP client
- Prisma: ORM for database management
- SQLite: Default database (can be changed to PostgreSQL or others)
- Groq: AI model provider for transcription and analysis

## Configuration

- The project uses environment variables for configuration. Ensure all necessary variables are set in your `.env.local` file.
- Tailwind CSS configuration can be found in `tailwind.config.ts`.
- TypeScript configuration is in `tsconfig.json`.

## API Routes

- `/api/meetings`: Handles CRUD operations for meetings
- `/api/transcribe`: Handles audio file transcription and analysis

## Debugging

- Use the browser's developer tools to debug client-side issues.
- For server-side debugging, use console.log statements or attach a debugger to your Node.js process.

## Performance Considerations

- Large audio files may take longer to process. Consider implementing a progress indicator for better user experience.
- Optimize database queries and indexes for improved performance as the number of meetings grows.

## Screenshots

### Landing Page
![Landing Page](public/landing.webp)

### Dashboard
![Dashboard](public/dashboard.png)

#### Meeting Summary
![Meeting Summary](public/meeting_summary.png)

#### Meeting Details
![Meeting Details](public/meeting_details.png)

These screenshots provide a visual representation of the application's main interfaces. The landing page showcases the initial user experience, while the dashboard displays the core functionality where users can upload audio files and view the AI-processed meeting information.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Here are some ways you can contribute:

- Report bugs and issues
- Suggest new features
- Improve documentation
- Submit pull requests with bug fixes or new features

Please read our contributing guidelines before submitting a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Support

If you encounter any problems or have questions, please open an issue on the GitHub repository.

## Acknowledgements

- Thanks to the Langflow team for providing the AI workflow management tool.
- Special thanks to all contributors who have helped shape this project.
