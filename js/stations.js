// ── Gas Stations Module ──
// Mixed real + fictional brands with delivery theme

const GAS_STATIONS = [
  // Real brands
  "Shell", "BP", "Petrom", "OMV", "Rompetrol", "Lukoil", "Total", "Esso",
  "Mobil", "Chevron", "ExxonMobil", "Texaco", "Gulf", "Sunoco", "Marathon",
  "Valero", "Phillips 66", "Conoco", "Q8", "Agip", "ENI", "Neste", "Circle K",
  "Statoil", "Preem", "Orlen", "MOL", "Slovnaft",
  // Fictional delivery-themed
  "FastFuel", "QuickStop", "RoadKing", "DeliveryDrop", "PitStop Pro",
  "HighOctane", "CrossroadsFuel", "MidnightFuel", "HorizonGas", "WaypointStop",
  "TurboFill", "RouteRunner", "TrailblazerFuel", "LastMileGas", "MileMarker",
  "Checkpoint Charlie", "FleetFuel", "CruiseControl", "OverdriveFuel", "GridlockGas",
  "Momentum Fuel", "Throttle Stop", "DriftStop", "ApexFuel", "BreakoutStation",
  "PivotPoint Gas", "StructureStop", "LiquidityLane", "OrderBlock Station", "FVG Fuel"
];

const Stations = {
  getAvailable(usedNames = []) {
    return GAS_STATIONS.filter(s => !usedNames.includes(s));
  }
};
