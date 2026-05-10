const { google } = require('googleapis');
const User = require('../models/User');

const getOAuth2Client = (accessToken, refreshToken) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  return oauth2Client;
};

/**
 * Syncs an AI-generated plan to the user's Google Calendar.
 * 
 * @param {Object} user - The user document from MongoDB
 * @param {Object} plan - The plan document containing the 'days' array
 */
const syncPlanToCalendar = async (user, plan) => {
  if (!user.googleRefreshToken && !user.googleAccessToken) {
    throw new Error('Google Calendar not linked. Please re-authenticate with Google.');
  }

  const oauth2Client = getOAuth2Client(user.googleAccessToken, user.googleRefreshToken);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Update tokens in DB if they were refreshed automatically by the client
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      user.googleAccessToken = tokens.access_token;
    }
    if (tokens.refresh_token) {
      user.googleRefreshToken = tokens.refresh_token;
    }
    await user.save();
  });

  const eventsCreated = [];

  // Hardcoded times logic
  // Returns a Date object for a specific day and hardcoded time string (e.g. "08:00")
  const getEventTime = (baseDateString, timeString) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date(baseDateString);
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return date;
  };

  const createEvent = async (title, description, startTime, endTime) => {
    const event = {
      summary: title,
      description: description,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC', // Ensure your server timezone handling is consistent
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 5 },
        ],
      },
    };

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      eventsCreated.push(response.data.htmlLink);
    } catch (error) {
      console.error(`Failed to create event: ${title}`, error);
      throw error;
    }
  };

  for (const day of plan.days) {
    // day.date is assumed to be parseable or we use the plan.matchDate logic
    // Let's ensure day.date is a valid date string.
    // If it's something like "Thu, 15 Oct", we might need to append the year.
    // Assuming the date refers to the current year or matches the matchDate year.
    
    // Safer approach: Calculate exact date based on matchDate and daysToMatch
    const matchDateObj = new Date(plan.matchDate);
    const currentDayDate = new Date(matchDateObj);
    // daysToMatch is typically positive (e.g., 2 days until match). We must subtract it from matchDate.
    currentDayDate.setDate(matchDateObj.getDate() - day.daysToMatch); 
    const dateStr = currentDayDate.toISOString().split('T')[0];

    const slots = [
      { name: 'Morning', data: day.schedule.morning, actTime: '08:00', mealTime: '09:00' },
      { name: 'Afternoon', data: day.schedule.afternoon, actTime: '13:00', mealTime: '14:00' },
      { name: 'Evening', data: day.schedule.evening, actTime: '18:00', mealTime: '19:00' },
      { name: 'Night', data: day.schedule.night, actTime: '21:00', mealTime: '22:00' }
    ];

    for (const slot of slots) {
      if (!slot.data) continue;

      // 1. Create Activity Event
      const actStart = getEventTime(dateStr, slot.actTime);
      const actEnd = new Date(actStart.getTime() + 60 * 60 * 1000); // 1 hour duration
      
      let actDesc = `Notes: ${slot.data.notes || ''}\n`;
      actDesc += `Intensity: ${slot.data.intensity || 0}/100\n`;
      if (slot.data.tags) actDesc += `Tags: ${slot.data.tags.join(', ')}`;

      await createEvent(
        `[${slot.name} Activity] ${slot.data.activity}`,
        actDesc,
        actStart,
        actEnd
      );

      // 2. Create Meal Event
      const mealStart = getEventTime(dateStr, slot.mealTime);
      const mealEnd = new Date(mealStart.getTime() + 30 * 60 * 1000); // 30 min duration
      
      await createEvent(
        `[${slot.name} Meal] ${slot.data.food}`,
        `Planned meal for ${slot.name}.`,
        mealStart,
        mealEnd
      );
    }

    // If it's match day, add the match event
    if (day.isMatchDay) {
      // Assuming matchTime is passed in inputs (e.g., '15:00')
      const mTime = plan.inputs.matchTime || '15:00';
      const matchStart = getEventTime(dateStr, mTime);
      const matchEnd = new Date(matchStart.getTime() + 2 * 60 * 60 * 1000); // 2 hours
      
      await createEvent(
        `🏆 MATCH DAY!`,
        `Sport: ${plan.sport}\nReadiness Score: ${plan.readiness_score}`,
        matchStart,
        matchEnd
      );
    }
  }

  return eventsCreated;
};

module.exports = {
  syncPlanToCalendar
};
