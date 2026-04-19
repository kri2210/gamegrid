# BoxBooking / GameGrid - Sports Venue Booking Platform

A full-stack web application built using the MERN stack (MongoDB, Express.js, React, Node.js) that allows users to seamlessly explore and book sports venues, and enables venue owners to manage their spaces, bookings, and events.

## Features

* **User/Player Portal:** Explore venues, view availability, book slots, register for events, and manage bookings.
* **Venue Owner Dashboard:** Manage venues, block specific dates/slots, view upcoming bookings, register offline/walk-in players, and create events.
* **Payment Integration:** Supports Razorpay for online transactions and manual UPI/Cash at Venue options.
* **Role-Based Authentication:** Secure JWT-based authentication for Owners and Players.
* **Dynamic UI:** Responsive and modern frontend built with React and Tailwind CSS.

## Tech Stack

* **Frontend:** React, Tailwind CSS, Axios
* **Backend:** Node.js, Express.js
* **Database:** MongoDB
* **Authentication:** JSON Web Tokens (JWT)
* **Payments:** Razorpay API

## Running Locally

### Prerequisites
- Node.js (v14 or higher)
- MongoDB account (or local instance)

### 1. Clone the repository
```bash
git clone https://github.com/kri2210/gamegrid.git
cd your-repo-name
```

### 2. Setup Backend
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory with the following structure:
```env
PORT=...
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```
Run the backend server:
```bash
npm start
# or npm run dev
# or node server.js
```

### 3. Setup Frontend
Open a new terminal window:
```bash
cd frontend
npm install
```
Create a `.env` file in the `frontend` directory with your API URL if necessary:
```env
REACT_APP_API_URL=http://localhost:5000
```
Start the React development server:
```bash
npm start
# or npm run dev
```

## Deployment
This application is configured to be easily deployed using Git.
* **Frontend:** Deployable on Vercel 
* **Backend:** Deployable on Render
* Ensure to set the required Environment Variables in your hosting provider's dashboard.
