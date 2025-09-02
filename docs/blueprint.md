# **App Name**: Lucky Draw

## Core Features:

- User Authentication: Allow users to log in with a username and password. The application stores their registered status and past events.
- Admin Panel: A protected page, secured with 'Utkarsh225', where admins can create new events with names, start and end times, results time, a choice between custom and random selection modes, and codes for prizes.
- Event Creation: Admins specify event details, including selection mode, and codes for prizes. Selecting Custom selection allows admin to specify exact number of winners, while Random selection choose registered users with equal probability.
- Lucky Box Display: Displays active event information (name, time) if available.  If no events are active, a 'No Active Event Right Now' message is shown.
- Event Registration: Users can register for upcoming events. Registration triggers a 4-second code animation, followed by a 'Successfully Registered' message and countdown timer to the results.
- Result Display: At result time, show the https://files.catbox.moe/9jmirk.mp4 animation in full screen, and then the result of the user draw with specific congrats/better luck next time messaging.
- Code Assignment: If it's result time, a tool will determine whether to assign a code to the user according to rules configured during event creation (admin custom selection or program random selection).
- Past Event Results: Displays previous events with a 'View Result' button. Displays event data on the page.  Displays result video one time only.
- Winner List: On the admin panel, allow to show a winner list, and edit codes.

## Style Guidelines:

- Primary color: Saturated blue (#4285F4) for trust and engagement.
- Background color: Light blue (#E8EBF4) to keep a friendly vibe.
- Accent color: Yellow (#FFEB3B) to draw attention to key elements.
- Font: 'Inter', a sans-serif, for clean, modern readability.
- Use the Crown icon (from the user request) consistently to indicate the secured page, and Lucky Box icon on appropriate button. Consider icons for status indication such as 'event live' or 'missed'.
- Background Image: Use https://i.postimg.cc/c4jzTRB3/fhdabstract101.jpg for background, Lucky Box at center.
- Use animation for event registration, and on the Results pages (using https://files.catbox.moe/9jmirk.mp4 ).