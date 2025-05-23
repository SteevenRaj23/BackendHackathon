// index.js
const express = require('express');
const app = express();
const axios = require('axios');
const port = 3000;
const googleTrends = require('google-trends-api');
const cors = require('cors');

app.use(cors())

app.get('/', (req, res) => {
  res.send('Hello, World from Express!');
});

app.get('/1', (req, res) => {
  res.send('Hello');
});




app.get('/events', async (req, res) => {
  const latitude = 28.6139;
  const longitude = 77.2090;
  const radius = 5000; // meters

  
  const ACCESS_TOKEN = "nycx593wC0S2q42TGbSuDwHgZ21VA4euQ5GUfWKz";

  const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`
  };

  const params = {
    within: `${radius}m@${latitude},${longitude}`,
    category: 'sports,concerts,festivals',
    limit: 10,
    sort: 'start'
  };

  try {
    const response = await axios.get('https://api.predicthq.com/v1/events/', { headers, params });
    const events = response.data.results;

    if (events && events.length > 0) {
      const formattedEvents = events.map(event => ({
        title: event.title,
        start: event.start,
        category: event.category
      }));
      res.json({ message: "🎫 Upcoming major events nearby:", events: formattedEvents,Length: events.length });
    } else {
      res.json({ message: "✅ No major events found nearby." });
    }
  } catch (error) {
    console.error('Error fetching events:', error.message);
    res.status(500).json({ error: "Failed to fetch events." });
  }
});


const GOOGLE_API_KEY = "AIzaSyDFvUVpGacaWzxYCo9cAmh6SN9Bwvn6gKU";
const PREDICTHQ_TOKEN = "nycx593wC0S2q42TGbSuDwHgZ21VA4euQ5GUfWKz";

app.get('/events2', async (req, res) => {
  const city = req.query.city;
  const radius = req.query.radius || 10000;

  if (!city) {
    return res.status(400).json({ error: "Missing required parameter: city" });
  }

  try {
    // Step 1: Geocode the city using Google Maps API
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${GOOGLE_API_KEY}`;
    const geoRes = await axios.get(geoUrl);
    const location = geoRes.data.results[0]?.geometry?.location;

    if (!location) {
      return res.status(404).json({ error: "City not found" });
    }

    const latitude = location.lat;
    const longitude = location.lng;

    // Step 2: Call PredictHQ API
    const headers = {
      Authorization: `Bearer ${PREDICTHQ_TOKEN}`
    };

    const params = {
      within: `${radius}m@${latitude},${longitude}`,
      category: 'sports,concerts,festivals',
      limit: 10,
      sort: 'start'
    };

    const phqResponse = await axios.get('https://api.predicthq.com/v1/events/', { headers, params });
    const events = phqResponse.data.results;

    search_terms = [`hotels in ${city}`];

    // results =  getInterestScores(search_terms, new Date('2025-02-01'))

    const weatherForecast = await getHourlyForecastForDate(city,'2025-05-25',latitude,longitude)

    if (events && events.length > 0) {
      const formattedEvents = events.map(event => ({
        title: event.title,
        start: event.start,
        category: event.category
      }));
      res.json({ message: `🎫 Upcoming events in ${city}:`, events: formattedEvents,Length: events.length,googleTrends:"50", forecast: weatherForecast });
    } else {
      res.json({ message: `✅ No major events found in ${city}.` });
    }

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: "Failed to fetch events." });
  }
});



async function getInterestScores(searchTerms, startTime = new Date('2023-01-01'), endTime = new Date()) {
    // Validate input search terms
    if (!Array.isArray(searchTerms) || searchTerms.length === 0) {
        console.warn("No search terms provided. Returning empty results.");
        return {};
    }
 
    // Initialize an object to store the results
    const results = {};
    searchTerms.forEach(term => {
        results[term] = null; // Initialize with null, will be updated if data is found
    });
 
    try {
        // Fetch interest over time for all keywords simultaneously
        // The library returns comparative data when multiple keywords are provided.
        const trendDataString = await googleTrends.interestOverTime({
            keyword: searchTerms,
            startTime: startTime,
            endTime: endTime,
            // geo: 'US', // Optional: specify a geographical region (e.g., 'US', 'IN')
            // hl: 'en-US' // Optional: specify host language
        });
 
       // console.log("Trend data string:", trendDataString);
        // Parse the JSON string response
        const trendData = JSON.parse(trendDataString);
 
        // Extract the timeline data
        const timelineData = trendData.default && trendData.default.timelineData;
 
        if (!timelineData || timelineData.length === 0) {
            console.log("No timeline data found for the given search terms and time range.");
            return results;
        }
 
        // Calculate the average interest score for each term
        // The 'value' array in timelineData corresponds to the order of keywords in searchTerms
        searchTerms.forEach((term, index) => {
            let totalInterest = 0;
            let dataPointsCount = 0;
 
            timelineData.forEach(dataPoint => {
                // Check if the value for the current keyword exists at this data point
                if (dataPoint.value && dataPoint.value[index] !== undefined) {
                    totalInterest += dataPoint.value[index];
                    dataPointsCount++;
                }
            });
 
            if (dataPointsCount > 0) {
                results[term] = Math.round(totalInterest / dataPointsCount);
            } else {
                results[term] = null; // No data found for this specific term
            }
        });
 
        return results;
 
    } catch (error) {
        console.error("Error fetching Google Trends data:", error.message);
        // Return results with null for all terms in case of a general error
        return results;
    }
}

const weatherCodeTranslation = {
    // Group 00-03: Cloud development/State of sky
    0: 'Cloud development not observed or not observable',
    1: 'Clouds generally dissolving or becoming less developed',
    2: 'State of sky on the whole unchanged',
    3: 'Clouds generally forming or developing',

    // Group 04-09: Haze, dust, sand, smoke
    4: 'Visibility reduced by smoke (e.g., veldt/forest fires, industrial smoke, volcanic ashes)',
    5: 'Haze',
    6: 'Widespread dust in suspension (not raised by wind)',
    7: 'Dust or sand raised by wind at or near station, no dust/sand whirls, no duststorm/sandstorm seen',
    8: 'Well-developed dust or sand whirl(s) seen, no duststorm/sandstorm',
    9: 'Duststorm or sandstorm within sight or at station during preceding hour',

    // Group 10-12: Mist/Fog patches
    10: 'Mist',
    11: 'Patches of shallow fog or ice fog',
    12: 'More or less continuous shallow fog or ice fog',

    // Group 13-19: Lightning, precipitation within sight
    13: 'Lightning visible, no thunder heard',
    14: 'Precipitation within sight, not reaching the ground',
    15: 'Precipitation within sight, reaching the ground (distant, > 5km)',
    16: 'Precipitation within sight, reaching the ground (near to, but not at station)',
    17: 'Thunderstorm, but no precipitation at time of observation',
    18: 'Squalls at or within sight of station during preceding hour or at time of observation',
    19: 'Funnel cloud(s) (tornado or waterspout) at or within sight of station during preceding hour or at time of observation',

    // Group 20-29: Precipitation, fog, duststorm during preceding hour but not at time of observation
    20: 'Drizzle (not freezing) or snow grains, not falling as showers, during preceding hour but not at time of observation',
    21: 'Rain (not freezing), not falling as showers, during preceding hour but not at time of observation',
    22: 'Snow, not falling as showers, during preceding hour but not at time of observation',
    23: 'Rain and snow or ice pellets, not falling as showers, during preceding hour but not at time of observation',
    24: 'Freezing drizzle or freezing rain, not falling as showers, during preceding hour but not at time of observation',
    25: 'Shower(s) of rain during preceding hour but not at time of observation',
    26: 'Shower(s) of snow, or of rain and snow, during preceding hour but not at time of observation',
    27: 'Shower(s) of hail, or of rain and hail, during preceding hour but not at time of observation',
    28: 'Fog or ice fog during preceding hour but not at time of observation',
    29: 'Thunderstorm (with or without precipitation) during preceding hour but not at time of observation',

    // Group 30-39: Duststorm, sandstorm, drifting/blowing snow
    30: 'Slight or moderate duststorm or sandstorm - has decreased during the preceding hour',
    31: 'Slight or moderate duststorm or sandstorm - no appreciable change during the preceding hour',
    32: 'Slight or moderate duststorm or sandstorm - has begun or has increased during the preceding hour',
    33: 'Severe duststorm or sandstorm - has decreased during the preceding hour',
    34: 'Severe duststorm or sandstorm - no appreciable change during the preceding hour',
    35: 'Severe duststorm or sandstorm - has begun or has increased during the preceding hour',
    36: 'Slight or moderate blowing snow, generally low (below eye level)',
    37: 'Heavy blowing snow, generally low (below eye level)',
    38: 'Slight or moderate blowing snow, generally high (above eye level)',
    39: 'Heavy blowing snow, generally high (above eye level)',

    // Group 40-49: Fog or ice fog at time of observation
    40: 'Fog or ice fog at a distance, but not at station during preceding hour, extending above observer\'s level',
    41: 'Fog or ice fog in patches',
    42: 'Fog or ice fog, sky visible, has become thinner during preceding hour',
    43: 'Fog or ice fog, sky invisible, has become thinner during preceding hour',
    44: 'Fog or ice fog, sky visible, no appreciable change during preceding hour',
    45: 'Fog or ice fog, sky invisible, no appreciable change during preceding hour',
    46: 'Fog or ice fog, sky visible, has begun or has become thicker during preceding hour',
    47: 'Fog or ice fog, sky invisible, has begun or has become thicker during preceding hour',
    48: 'Fog, depositing rime, sky visible',
    49: 'Fog, depositing rime, sky invisible',

    // Group 50-59: Drizzle at time of observation
    50: 'Drizzle, not freezing, intermittent, slight at time of observation',
    51: 'Drizzle, not freezing, continuous, slight at time of observation',
    52: 'Drizzle, not freezing, intermittent, moderate at time of observation',
    53: 'Drizzle, not freezing, continuous, moderate at time of observation',
    54: 'Drizzle, not freezing, intermittent, heavy at time of observation',
    55: 'Drizzle, not freezing, continuous, heavy at time of observation',
    56: 'Drizzle, freezing, light',
    57: 'Drizzle, freezing, moderate or heavy (dense)',
    58: 'Drizzle and rain, slight',
    59: 'Drizzle and rain, moderate or heavy',

    // Group 60-69: Rain at time of observation
    60: 'Rain, not freezing, intermittent, slight at time of observation',
    61: 'Rain, not freezing, continuous, slight at time of observation',
    62: 'Rain, not freezing, intermittent, moderate at time of observation',
    63: 'Rain, not freezing, continuous, moderate at time of observation',
    64: 'Rain, not freezing, intermittent, heavy at time of observation',
    65: 'Rain, not freezing, continuous, heavy at time of observation',
    66: 'Rain, freezing, light',
    67: 'Rain, freezing, moderate or heavy',
    68: 'Rain or drizzle and snow, slight',
    69: 'Rain or drizzle and snow, moderate or heavy',

    // Group 70-79: Solid precipitation not in showers at time of observation
    70: 'Intermittent fall of snowflakes, slight at time of observation',
    71: 'Continuous fall of snowflakes, slight at time of observation',
    72: 'Intermittent fall of snowflakes, moderate at time of observation',
    73: 'Continuous fall of snowflakes, moderate at time of observation',
    74: 'Intermittent fall of snowflakes, heavy at time of observation',
    75: 'Continuous fall of snowflakes, heavy at time of observation',
    76: 'Diamond dust (with or without fog)',
    77: 'Snow grains (with or without fog)',
    78: 'Isolated star-like snow crystals (with or without fog)',
    79: 'Ice pellets',

    // Group 80-89: Showers at time of observation
    80: 'Rain shower(s), slight',
    81: 'Rain shower(s), moderate or heavy',
    82: 'Rain shower(s), violent',
    83: 'Shower(s) of rain and snow mixed, slight',
    84: 'Shower(s) of rain and snow mixed, moderate or heavy',
    85: 'Snow shower(s), slight',
    86: 'Snow shower(s), moderate or heavy',
    87: 'Shower(s) of snow pellets or small hail, with or without rain or rain and snow mixed - slight',
    88: 'Shower(s) of snow pellets or small hail, with or without rain or rain and snow mixed - moderate or heavy',
    89: 'Shower(s) of hail, with or without rain or rain and snow mixed, not associated with thunder - slight',

    // Group 90-99: Thunderstorm at time of observation (with or without precipitation)
    90: 'Shower(s) of hail, with or without rain or rain and snow mixed, not associated with thunder - moderate or heavy',
    91: 'Slight rain at time of observation - Thunderstorm during preceding hour but not at time of observation',
    92: 'Moderate or heavy rain at time of observation - Thunderstorm during preceding hour but not at time of observation',
    93: 'Slight snow, or rain and snow mixed or hail at time of observation - Thunderstorm during preceding hour but not at time of observation',
    94: 'Moderate or heavy snow, or rain and snow mixed or hail at time of observation - Thunderstorm during preceding hour but not at time of observation',
    95: 'Thunderstorm, slight or moderate, without hail, but with rain and/or snow at time of observation',
    96: 'Thunderstorm, slight or moderate, with hail at time of observation',
    97: 'Thunderstorm, heavy, without hail, but with rain and/or snow at time of observation',
    98: 'Thunderstorm combined with duststorm or sandstorm at time of observation',
    99: 'Thunderstorm, heavy, with hail at time of observation'
};

const weatherCode = {
  1: 'Sunny',
  3: 'Cloudy',
  45: 'Foggy',
  63: 'Rainy',
  0: 'Clear'
}


function translateToClosestWeatherCode(wmoCode) {
  // Check if the code is directly one of the target codes
  if (weatherCode.hasOwnProperty(wmoCode)) {
      return wmoCode;
  }

  // Mapping logic for other WMO codes to the 5 closest categories
  // This logic needs to consider the nuances of the full WMO table
  if (wmoCode >= 0 && wmoCode <= 3) {
      if (wmoCode === 0) return 0;
      if (wmoCode === 1) return 1;
      // Codes 2 (Partly cloudy) and 3 (Overcast/Clouds generally forming)
      return 3; // Map to Cloudy
  } else if (wmoCode >= 4 && wmoCode <= 9) {
      // Haze, dust, smoke related visibility reduction
      // These are not "foggy" in the traditional sense, but are atmospheric obscurations.
      // Closest among the 5 might be 'Cloudy' as a general non-clear category,
      // or a specific handling might be needed depending on context.
      // For simplicity, let's group with 'Cloudy' (3) as it's not clear, rainy, or classic fog.
      return 3;
  } else if (wmoCode >= 10 && wmoCode <= 12) {
      // Mist, shallow fog
      return 45; // Map to Foggy
  } else if (wmoCode >= 13 && wmoCode <= 19) {
      // Lightning, distant precipitation, squalls, funnel clouds
      // These are more about atmospheric phenomena than general "weather type" for a simple 5-category mapping.
      // If precipitation is involved (14, 15, 16), map to rainy.
      // For others (13, 17, 18, 19), a general 'Cloudy' (3) might be the most appropriate.
      if (wmoCode === 14 || wmoCode === 15 || wmoCode === 16) {
            return 63; // Precipitation within sight
      }
      return 3; // Other general phenomena
  } else if (wmoCode >= 20 && wmoCode <= 29) {
      // Precipitation, fog, duststorm etc., during preceding hour but not at observation time
      // This group indicates "past weather". For current weather, often treated as "no significant weather".
      // However, if we must map, and it involves precipitation (20-27), map to rainy.
      // If it's fog (28), map to foggy.
      // If it's duststorm/thunderstorm without current precip (29), map to cloudy.
      if (wmoCode >= 20 && wmoCode <= 27) { // Drizzle, Rain, Snow, Freezing precip, Showers
          return 63; // Map to Rainy
      } else if (wmoCode === 28) { // Fog
          return 45; // Map to Foggy
      }
      return 3; // General (Duststorm/Thunderstorm)
  } else if (wmoCode >= 30 && wmoCode <= 39) {
      // Duststorm, sandstorm, drifting/blowing snow
      // Similar to codes 4-9, these are obscurations. 'Cloudy' (3) as a general category for obscured sky.
      // If 'blowing snow' is considered precipitation, could map to 63, but generally distinct.
      return 3;
  } else if (wmoCode >= 40 && wmoCode <= 49) {
      // Fog or ice fog at time of observation (including patches, thinning, thickening)
      return 45; // Map to Foggy
  } else if (wmoCode >= 50 && wmoCode <= 69) {
      // Drizzle, Rain, Freezing Rain/Drizzle, Rain & Snow
      return 63; // Map all forms of liquid/mixed precipitation to Rainy
  } else if (wmoCode >= 70 && wmoCode <= 79) {
      // Snow fall, Snow grains, Diamond dust, Ice pellets
      // These are solid precipitation. As discussed, no explicit 'snowy' category.
      // Grouping with 'Cloudy' (3) as a non-clear, non-rain, non-fog state.
      // Or if you want to emphasize precipitation, use 63 (Rainy). Defaulting to 3 for now.
      return 3;
  } else if (wmoCode >= 80 && wmoCode <= 90) {
      // Rain showers, Snow showers, Showers of pellets/hail
      return 63; // Map all showers (rain, snow, hail) to Rainy as they involve precipitation
  } else if (wmoCode >= 91 && wmoCode <= 99) {
      // Thunderstorm (with or without precipitation/hail/duststorm)
      return 63; // Map all thunderstorms to Rainy as they almost always involve precipitation (or recent precipitation)
  }

  // If the code is not recognized or doesn't fit any of the 5 categories
  console.warn(`Unknown WMO code or no direct mapping to 5 closest categories: ${wmoCode}`);
  return null;
}

async function getHourlyForecastForDate(location, targetDateStr, lat, long) {
   // console.log(`--- Tool: get_hourly_forecast_for_date called for location: ${location}, date: ${targetDateStr} ---`);
    // 1. Get coordinates for the location
    const coords = { latitude: lat, longitude: long };
    
    try {
        // 2. Validate target date and forecast range
        const targetDate = new Date(targetDateStr);
        // Set targetDate to start of day to avoid timezone issues with comparison
        targetDate.setUTCHours(0, 0, 0, 0);
 
        const today = new Date();
        // Set today to start of day UTC
        today.setUTCHours(0, 0, 0, 0);
 
        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        const daysToRequest = 16; // Open-Meteo typically provides up to 16 days of forecast
 
        // Calculate difference in days
        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / MS_PER_DAY);
 
        if (diffDays < 0 || diffDays >= daysToRequest) {
            return { status: "error", error_message: `Forecast available only for the next ${daysToRequest} days (including today). Requested date: ${targetDateStr}` };
        }
 
        // 3. Construct Open-Meteo API request
        const BASE_URL = "https://api.open-meteo.com/v1/forecast";
        const params = new URLSearchParams({
            latitude: coords.latitude,
            longitude: coords.longitude,
            hourly: ["temperature_2m","weather_code"],
            timezone: "auto", // Auto-detect timezone
            start_date: targetDateStr,
            end_date: targetDateStr
        });
 
        const requestUrl = `${BASE_URL}?${params.toString()}`;
       // console.log(`Fetching forecast from: ${requestUrl}`);
 
        const response = await fetch(requestUrl);
        //console.log(response, lat, long);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Open-Meteo API HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }
 
        const data = await response.json();
        
        const wthrCode = translateToClosestWeatherCode(data.hourly.weather_code[0])
        console.log(wthrCode)
        const weather = weatherCode[wthrCode]
        // 4. Process the forecast data
        if (data && data.hourly && data.hourly.time && data.hourly.temperature_2m) {
            const hourlyDataForDate = [];
            const targetDateOnly = targetDateStr; // Keep 'YYYY-MM-DD' for comparison
 
            for (let i = 0; i < data.hourly.time.length; i++) {
                const dtStr = data.hourly.time[i];
                const temp = data.hourly.temperature_2m[i];
                // Check if the hourly data point belongs to the target_date
                if (dtStr.startsWith(targetDateOnly)) {
                    hourlyDataForDate.push({
                        time: dtStr,
                        temperature_celsius: temp
                    });
                }
            }
 
            if (hourlyDataForDate.length > 0) {
                const minTemp = Math.min(...hourlyDataForDate.map(h => h.temperature_celsius));
                const maxTemp = Math.max(...hourlyDataForDate.map(h => h.temperature_celsius));
 
                const report = {
                    location: location,
                    date: targetDateStr,
                    hourly_temperatures: hourlyDataForDate,
                    weather:weather,
                    daily_min_temp_celsius: minTemp,
                    daily_max_temp_celsius: maxTemp,
                    units: data.hourly_units.temperature_2m,
                    timezone: data.timezone || "N/A"
                };
                return { status: "success", report: report };
            } else {
                return { status: "error", error_message: `No hourly temperature data found for ${location} on ${targetDateStr}. Date might be out of range or API issue.` };
            }
        } else {
            return { status: "error", error_message: `Invalid data structure received from Open-Meteo for ${location} on ${targetDateStr}.` };
        }
 
    } catch (error) {
        console.error("Error in getHourlyForecastForDate:", error.message);
        return { status: "error", error_message: `An unexpected error occurred: ${error.message}` };
    }
}
 





app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


