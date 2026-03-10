# Roadmap & Suggestions for ClassConnect

This document outlines potential features and improvements to enhance the user experience, trust, and functionality of the ClassConnect marketplace.

## 🚀 High Priority (Immediate Value)

### 1. Discovery & Search
- **Map View:** Implement a map interface using `react-native-maps` to show task locations visually.
- **Advanced Filters:** Add filtering by price, distance, and specific categories (Cleaning, Moving, Tech, etc.).
- **Keyword Search:** Add a search bar to the "Local Jobs" screen.

### 2. User Profiles & Trust
- [x] **Profile Customization:** Allow users to add a bio, list their skills, and upload/change their profile image.
- **Verification System:** Implement a "Verified Neighbor" badge for users who verify their phone/ID.
- **Media Attachments:** Allow posters to upload photos of the task (e.g., a photo of the item that needs fixing).

### 3. Messaging Enhancements
- **Image Sharing:** Allow users to send photos within the chat for better task coordination.
- **Read Receipts:** Visual indicators (ticks) when a message has been read.

---

## 🎨 UI / UX Improvements

### 1. Perceived Performance
- **Skeleton Loaders:** Use shimmering placeholders while data is fetching to make the app feel snappier.
- **Optimistic UI:** Update the UI immediately when a user sends a message or deletes a notification, then sync with the database in the background.

### 2. Interaction Design
- **Swipe Actions:** Add swipe gestures to notifications (delete) and the job feed (save/hide).
- **Haptic Feedback:** Add subtle vibrations for successful actions like "Hiring" or "Task Published."

---

## 🛠️ Technical & Scalability

### 1. Real-time Enhancements
- **Native Push Notifications:** Integrate `expo-notifications` to alert users even when the app is in the background.
- **Typing Indicators:** Show when the other person is typing in the chat.

### 2. Payments & Security
- **Payment Integration:** Integrate Stripe or PayPal for secure, in-app payments and escrow.
- **Report User/Task:** Add a flagging system for inappropriate content or safety concerns.

---

## 📈 Long-term Vision
- **Recurring Tasks:** Allow users to post tasks that repeat weekly (e.g., lawn mowing).
- **Community Events:** A separate section for free neighborhood gatherings or news.
- **Tasker Levels:** Gamify the experience with "Level up" badges based on positive reviews.
