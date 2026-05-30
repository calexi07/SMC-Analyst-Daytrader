// ── Cities Module ──
// Bullish = base currency country cities
// Bearish = quote currency country cities
// Gold: Bullish = global financial hubs, Bearish = US cities
// DAX: Bullish = German cities, Bearish = European cities
// NAS100: Bullish = US cities, Bearish = European cities

const CITY_POOLS = {

  // ── EUR base ──
  EUR: ["Paris", "Rome", "Madrid", "Amsterdam", "Brussels", "Vienna", "Prague", "Budapest", "Warsaw", "Lisbon",
        "Milan", "Barcelona", "Munich", "Frankfurt", "Hamburg", "Lyon", "Marseille", "Naples", "Turin", "Seville",
        "Athens", "Zurich", "Geneva", "Bern", "Krakow", "Bucharest", "Sofia", "Ljubljana", "Tallinn", "Riga",
        "Vilnius", "Helsinki", "Stockholm", "Oslo", "Copenhagen"],

  // ── GBP base ──
  GBP: ["London", "Manchester", "Birmingham", "Edinburgh", "Glasgow", "Liverpool", "Bristol", "Leeds",
        "Sheffield", "Newcastle", "Nottingham", "Leicester", "Cardiff", "Belfast", "Oxford", "Cambridge",
        "Brighton", "Portsmouth", "Southampton", "York", "Bath", "Exeter", "Norwich", "Derby", "Coventry",
        "Hull", "Stoke", "Plymouth", "Aberdeen", "Dundee"],

  // ── AUD base ──
  AUD: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra", "Gold Coast", "Newcastle",
        "Wollongong", "Hobart", "Geelong", "Townsville", "Cairns", "Darwin", "Bendigo", "Ballarat",
        "Launceston", "Mackay", "Rockhampton", "Toowoomba", "Sunshine Coast", "Bunbury", "Albury",
        "Wagga Wagga", "Hervey Bay", "Mildura", "Shepparton", "Gladstone", "Tamworth", "Orange"],

  // ── NZD base ──
  NZD: ["Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga", "Napier", "Dunedin", "Palmerston North",
        "Nelson", "Rotorua", "New Plymouth", "Whangarei", "Invercargill", "Whanganui", "Gisborne",
        "Upper Hutt", "Lower Hutt", "Porirua", "Masterton", "Blenheim", "Timaru", "Ashburton",
        "Taupo", "Greymouth", "Queenstown", "Kapiti", "Levin", "Pukekohe", "Tokoroa", "Thames"],

  // ── USD ──
  USD: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio",
        "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville", "Fort Worth", "Columbus",
        "Charlotte", "Indianapolis", "San Francisco", "Seattle", "Denver", "Nashville", "Boston",
        "El Paso", "Washington DC", "Las Vegas", "Louisville", "Memphis", "Portland", "Baltimore",
        "Milwaukee", "Albuquerque"],

  // ── CHF ──
  CHF: ["Zurich", "Geneva", "Basel", "Bern", "Lausanne", "Winterthur", "Lucerne", "St. Gallen",
        "Lugano", "Biel", "Thun", "Köniz", "La Chaux-de-Fonds", "Schaffhausen", "Fribourg",
        "Chur", "Vernier", "Neuchâtel", "Uster", "Sion", "Emmen", "Lancy", "Davos", "Arbon",
        "Zug", "Sierre", "Arlesheim", "Nyon", "Meyrin", "Renens"],

  // ── CAD ──
  CAD: ["Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Quebec City",
        "Hamilton", "Kitchener", "London", "Victoria", "Halifax", "Oshawa", "Windsor", "Saskatoon",
        "Regina", "St. John's", "Barrie", "Kelowna", "Abbotsford", "Sherbrooke", "Trois-Rivières",
        "Saguenay", "Moncton", "Sudbury", "Kingston", "Guelph", "Burnaby", "Richmond"],

  // ── JPY ──
  JPY: ["Tokyo", "Osaka", "Yokohama", "Nagoya", "Sapporo", "Fukuoka", "Kobe", "Kyoto", "Kawasaki",
        "Saitama", "Hiroshima", "Sendai", "Chiba", "Kitakyushu", "Sakai", "Niigata", "Hamamatsu",
        "Shizuoka", "Sagamihara", "Okayama", "Kumamoto", "Kagoshima", "Matsuyama", "Kanazawa",
        "Utsunomiya", "Oita", "Naha", "Nagasaki", "Toyama", "Gifu"],

  // ── BTCUSD ──
  BTCUSD_bull: ["Miami", "Singapore", "Zug", "Dubai", "Lugano", "Lisbon", "Amsterdam", "Zurich",
                "Hong Kong", "Tokyo", "Sydney", "Austin", "Denver", "Vancouver", "Tallinn",
                "Riga", "Ljubljana", "Valletta", "Nicosia", "Panama City", "El Salvador",
                "San Francisco", "New York", "Chicago", "London", "Geneva", "Seoul",
                "Taipei", "Bangkok", "Kuala Lumpur"],
  BTCUSD_bear: ["Beijing", "Moscow", "Ankara", "Cairo", "Algiers", "Dhaka", "Islamabad",
                "Kathmandu", "Hanoi", "Jakarta", "Lagos", "Accra", "Nairobi", "Caracas",
                "Bogota", "Lima", "Riyadh", "Tehran", "Baghdad", "Kabul",
                "Minsk", "Tashkent", "Baku", "Yerevan", "Tbilisi", "Bishkek",
                "Dushanbe", "Ashgabat", "Nur-Sultan", "Ulaanbaatar"],

  // ── XAUUSD ──
  XAUUSD_bull: ["London", "Zurich", "Singapore", "Hong Kong", "Dubai", "Shanghai", "Mumbai", "Sydney",
                "Tokyo", "Toronto", "Frankfurt", "Paris", "Geneva", "Luxembourg", "Amsterdam",
                "Seoul", "Taipei", "Bangkok", "Kuala Lumpur", "Jakarta", "Melbourne", "Oslo",
                "Stockholm", "Vienna", "Milan", "Brussels", "Madrid", "Lisbon", "Athens", "Warsaw"],
  XAUUSD_bear: ["New York", "Chicago", "Los Angeles", "Houston", "Dallas", "San Francisco", "Boston",
                "Atlanta", "Miami", "Seattle", "Denver", "Phoenix", "Philadelphia", "Detroit",
                "Minneapolis", "Portland", "Charlotte", "Las Vegas", "Nashville", "Austin",
                "San Diego", "Tampa", "Baltimore", "Indianapolis", "Columbus", "Memphis",
                "Louisville", "Richmond", "Salt Lake City", "Kansas City"],

  // ── GER40 / DAX ──
  GER40_bull: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart", "Düsseldorf", "Leipzig",
               "Dortmund", "Essen", "Bremen", "Dresden", "Hannover", "Nuremberg", "Duisburg",
               "Bochum", "Wuppertal", "Bielefeld", "Bonn", "Münster", "Karlsruhe", "Mannheim",
               "Augsburg", "Wiesbaden", "Mönchengladbach", "Gelsenkirchen", "Braunschweig",
               "Aachen", "Kiel", "Chemnitz"],
  GER40_bear: ["Paris", "Amsterdam", "Brussels", "Vienna", "Rome", "Madrid", "Lisbon", "Prague",
               "Warsaw", "Budapest", "Athens", "Stockholm", "Copenhagen", "Oslo", "Helsinki",
               "Zurich", "Milan", "Barcelona", "Lyon", "Marseille", "Krakow", "Bucharest",
               "Sofia", "Ljubljana", "Tallinn", "Riga", "Vilnius", "Bratislava", "Valletta", "Nicosia"],

  // ── NAS100 ──
  NAS100_bull: ["New York", "Los Angeles", "Chicago", "San Francisco", "Seattle", "Boston", "Austin",
                "Denver", "Atlanta", "Dallas", "Miami", "Houston", "Portland", "San Diego",
                "Nashville", "Phoenix", "Minneapolis", "Salt Lake City", "Raleigh", "Charlotte",
                "Indianapolis", "Columbus", "Kansas City", "Pittsburgh", "Detroit", "Cleveland",
                "Tampa", "Orlando", "Las Vegas", "Baltimore"],
  NAS100_bear: ["London", "Paris", "Amsterdam", "Frankfurt", "Dublin", "Stockholm", "Berlin",
                "Zurich", "Vienna", "Madrid", "Milan", "Brussels", "Copenhagen", "Oslo",
                "Helsinki", "Lisbon", "Rome", "Warsaw", "Prague", "Budapest", "Barcelona",
                "Munich", "Hamburg", "Lyon", "Marseille", "Krakow", "Bucharest", "Sofia",
                "Ljubljana", "Tallinn"],
};

// ── Map pair → [bullish pool, bearish pool] ──
const PAIR_CITIES = {
  EURUSD:  { bull: CITY_POOLS.EUR, bear: CITY_POOLS.USD },
  GBPUSD:  { bull: CITY_POOLS.GBP, bear: CITY_POOLS.USD },
  AUDUSD:  { bull: CITY_POOLS.AUD, bear: CITY_POOLS.USD },
  NZDUSD:  { bull: CITY_POOLS.NZD, bear: CITY_POOLS.USD },
  USDCHF:  { bull: CITY_POOLS.USD, bear: CITY_POOLS.CHF },
  USDCAD:  { bull: CITY_POOLS.USD, bear: CITY_POOLS.CAD },
  USDJPY:  { bull: CITY_POOLS.USD, bear: CITY_POOLS.JPY },
  GBPJPY:  { bull: CITY_POOLS.GBP, bear: CITY_POOLS.JPY },
  EURJPY:  { bull: CITY_POOLS.EUR, bear: CITY_POOLS.JPY },
  AUDJPY:  { bull: CITY_POOLS.AUD, bear: CITY_POOLS.JPY },
  GBPAUD:  { bull: CITY_POOLS.GBP, bear: CITY_POOLS.AUD },
  EURGBP:  { bull: CITY_POOLS.EUR, bear: CITY_POOLS.GBP },
  AUDCHF:  { bull: CITY_POOLS.AUD, bear: CITY_POOLS.CHF },
  AUDNZD:  { bull: CITY_POOLS.AUD, bear: CITY_POOLS.NZD },
  EURAUD:  { bull: CITY_POOLS.EUR, bear: CITY_POOLS.AUD },
  XAUUSD:  { bull: CITY_POOLS.XAUUSD_bull, bear: CITY_POOLS.XAUUSD_bear },
  GER40:   { bull: CITY_POOLS.GER40_bull,  bear: CITY_POOLS.GER40_bear  },
  NAS100:  { bull: CITY_POOLS.NAS100_bull, bear: CITY_POOLS.NAS100_bear },
  BTCUSD:  { bull: CITY_POOLS.BTCUSD_bull, bear: CITY_POOLS.BTCUSD_bear },
};

// ── Get available cities for a pair + direction, excluding active names ──
const Cities = {

  getAvailable(pair, direction, usedNames = []) {
    const pool = PAIR_CITIES[pair];
    if (!pool) return [];
    const cities = direction === 'bull' ? pool.bull : pool.bear;
    return cities.filter(c => !usedNames.includes(c));
  },

  // Extract city name from zone name (city is stored as zone.name)
  isCity(pair, name) {
    const pool = PAIR_CITIES[pair];
    if (!pool) return false;
    return pool.bull.includes(name) || pool.bear.includes(name);
  }

};
