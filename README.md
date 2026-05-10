# 🚀 ProReady: AI-Powered Athlete Match Preparation

ProReady is an intelligent match preparation platform designed to help athletes (specifically Football and Cricket players) optimize their performance. By leveraging advanced AI, the platform provides personalized training, nutrition, and recovery plans based on an athlete's current physical state and historical data.

---

## 🛠️ Technology Stack

*   **Frontend**: Built with **HTML5,  CSS3, and JavaScript**. It uses a modern, responsive design with glassmorphism effects and dynamic animations.
*   **Backend**: Powered by **Node.js** and **Express.js**, providing a robust and scalable RESTful API architecture.
*   **Database**: **MongoDB** with **Mongoose ODM** for flexible, document-based data storage and efficient relationship management.
*   **Authentication**: Implements **JSON Web Tokens (JWT)** for secure, stateless session management and **Bcrypt** for industry-standard password hashing.

---

## 🔌 APIs & External Services

*   **Google Gemini AI (Generative AI)**: The core engine that generates personalized preparation plans, readiness scores, and actionable insights using the `gemini-2.0-flash` model.
*   **Cloudinary**: Used for high-performance cloud storage and delivery of media assets, specifically for match report videos and profile images.
*   **Dotenv**: Manages environment variables to ensure secure handling of sensitive API keys and database credentials.

---

## 🧠 Development Approach

*   **AI-First Design**: Unlike traditional static planners, ProReady puts AI at the center, using real-time inputs to dynamically adjust schedules.
*   **Structured Output Logic**: Utilizes strict JSON schema validation for AI responses to ensure the frontend always receives predictable, high-quality data.
*   **Modular Architecture**: Separates concerns into Routes, Models, Middleware, and Utils, making the codebase maintainable and easy to scale.
*   **Responsive UI/UX**: Focuses on a "Mobile-First" approach, ensuring athletes can update their status and check plans on the go.

---

## 🔄 How It Works

*   **Data Collection**: Users input their sport, match date, sleep hours, muscle soreness, and recent training intensity.
*   **Contextual Analysis**: The system retrieves historical match performance and readiness data to provide context to the AI.
*   **AI Generation**: The Gemini API processes the current state + history to generate a 4-period-per-day (Morning, Afternoon, Evening, Night) preparation plan.
*   **Readiness Scoring**: An algorithm (weighted by AI) calculates a 0-100 score indicating how "Match Ready" the athlete is.
*   **Media Integration**: Athletes can upload highlights or match footage via Cloudinary to be reviewed by their coaches.

---

## 🔮 Future Updates

*   **Wearable Integration**: Syncing with Apple Health, Garmin, and WHOOP to automate sleep and recovery data input.
*   **Expanded Sport Library**: Adding specialized preparation logic for Basketball, Tennis, and MMA.
*   **Advanced Coach Dashboard**: Real-time monitoring of entire team readiness levels and automated "Risk of Injury" alerts.
*   **Nutrition Deep-Dive**: Generating specific meal recipes and hydration schedules based on local climate data.
*   **Community & Leaderboards**: Safe social spaces for athletes to share preparation milestones and compete in readiness challenges.
