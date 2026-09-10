/*
  GURDASPUR FLOOD-DAMAGED PADDY ANALYSIS
  Dera Baba Nanak block, Gurdaspur district, Punjab
  Skypace — SKYP-36, SKYP-40 to SKYP-49

  Covers: AOI setup, 3-date NDVI, NDWI, vegetation-loss change detection,
  and two SAR (Sentinel-1) flood-detection methods with a full comparison.
  Run top to bottom in the Google Earth Engine Code Editor.
*/

// ============================================
// 1. AREA OF INTEREST
// ============================================
var aoi = ee.Geometry.Rectangle([74.95, 31.90, 75.12, 32.034]);
Map.centerObject(aoi, 11);
Map.addLayer(aoi, {color: 'grey'}, 'AOI', false);

// ============================================
// 2. SENTINEL-2 (OPTICAL) — CLOUD MASK + NDVI
// ============================================
function maskS2clouds(image) {
  var scl = image.select('SCL');
  var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)); // cloud, cloud shadow, cirrus
  return image.updateMask(mask).divide(10000)
    .copyProperties(image, ['system:time_start']);
}

function addNDVI(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
}

function getS2Composite(start, end) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
    .map(maskS2clouds)
    .map(addNDVI)
    .median()
    .clip(aoi);
}

// Three time windows
var s2Pre = getS2Composite('2025-08-01', '2025-08-15');       // pre-flood baseline
var s2Peak = getS2Composite('2025-09-01', '2025-09-15');      // peak flood
var s2Recovery = getS2Composite('2025-10-25', '2025-11-15');  // post-flood recovery

var s2PeakValidMask = s2Peak.select('NDVI').mask();

var ndviVis = {min: -0.2, max: 0.8, palette: ['blue', 'white', 'green']};
Map.addLayer(s2Pre.select('NDVI'), ndviVis, 'NDVI Pre-Flood (Aug 1-15)', false);
Map.addLayer(s2Peak.select('NDVI'), ndviVis, 'NDVI Peak-Flood (Sep 1-15)');
Map.addLayer(s2Recovery.select('NDVI'), ndviVis, 'NDVI Recovery (Oct 25-Nov 15)', false);

// ============================================
// 3. NDWI — PEAK FLOOD WATER (OPTICAL, CLOUD-LIMITED)
// ============================================
function getNDWIComposite(start, end) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
    .map(maskS2clouds)
    .map(function(img) {
      var ndwi = img.normalizedDifference(['B3', 'B8']).rename('NDWI');
      return img.addBands(ndwi);
    })
    .median()
    .clip(aoi);
}

var peakNDWI = getNDWIComposite('2025-09-01', '2025-09-15');
Map.addLayer(peakNDWI.select('NDWI'), {min: -0.3, max: 0.5, palette: ['brown', 'white', 'blue']}, 'NDWI Flood Extent (Peak)', false);

// ============================================
// 4. VEGETATION LOSS (NDVI CHANGE, PRE VS PEAK)
// ============================================
var ndviChange = s2Peak.select('NDVI').subtract(s2Pre.select('NDVI')).rename('NDVI_change');
Map.addLayer(ndviChange, {min: -0.5, max: 0.5, palette: ['red', 'white', 'green']}, 'NDVI Change (Vegetation Only)', false);

var vegLossMask = ndviChange.lt(-0.2).selfMask();
Map.addLayer(vegLossMask, {palette: ['orange']}, 'Significant Vegetation Loss');

print('--- VEGETATION LOSS ---');
print('Pixels with significant vegetation loss:', vegLossMask.reduceRegion({
  reducer: ee.Reducer.count(), geometry: aoi, scale: 10, maxPixels: 1e9
}));
print('Total valid NDVI pixels (peak window):', s2Peak.select('NDVI').reduceRegion({
  reducer: ee.Reducer.count(), geometry: aoi, scale: 10, maxPixels: 1e9
}));

// ============================================
// 5. SENTINEL-1 (SAR) — FLOOD DETECTION
// ============================================
function getS1Composite(start, end) {
  return ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .select('VV')
    .median()
    .clip(aoi);
}

var s1Pre = getS1Composite('2025-08-01', '2025-08-15');
var s1Peak = getS1Composite('2025-09-01', '2025-09-15');

Map.addLayer(s1Peak, {min: -25, max: 0}, 'S1 VV Peak (raw backscatter)', false);

// Method A: fixed threshold — flags any pixel currently wet (river + new flooding)
var floodMaskThreshold = s1Peak.lt(-17).selfMask().rename('flood_threshold');
Map.addLayer(floodMaskThreshold, {palette: ['red']}, 'Flood - Threshold Method');

// Method B: change detection — flags pixels that got newly wet (isolates real flooding)
var sarChange = s1Peak.subtract(s1Pre).rename('VV_change');
var floodMaskChange = sarChange.lt(-3).selfMask().rename('flood_change');
Map.addLayer(floodMaskChange, {palette: ['cyan']}, 'Flood - Change Method (primary)');

// ============================================
// 6. STATS — IMAGE COUNTS, FLOOD AREA, OPTICAL/SAR OVERLAP
// ============================================
print('--- IMAGE COUNTS (peak window) ---');
print('S2 images:', ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi).filterDate('2025-09-01', '2025-09-15')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30)).size());
print('S1 images:', ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(aoi).filterDate('2025-09-01', '2025-09-15')
  .filter(ee.Filter.eq('instrumentMode', 'IW')).size());

print('--- METHOD A: THRESHOLD-BASED ---');
print('Total flood pixels:', floodMaskThreshold.reduceRegion({
  reducer: ee.Reducer.count(), geometry: aoi, scale: 10, maxPixels: 1e9}));
print('Overlap with valid S2 (peak):', floodMaskThreshold.updateMask(s2PeakValidMask).reduceRegion({
  reducer: ee.Reducer.count(), geometry: aoi, scale: 10, maxPixels: 1e9}));

print('--- METHOD B: CHANGE-DETECTION ---');
print('Total flood pixels:', floodMaskChange.reduceRegion({
  reducer: ee.Reducer.count(), geometry: aoi, scale: 10, maxPixels: 1e9}));
print('Overlap with valid S2 (peak):', floodMaskChange.updateMask(s2PeakValidMask).reduceRegion({
  reducer: ee.Reducer.count(), geometry: aoi, scale: 10, maxPixels: 1e9}));

// ============================================
// 7. EXPORTS (optional — run manually when ready)
// ============================================
Export.image.toDrive({
  image: floodMaskChange,
  description: 'DBN_SAR_Flood_ChangeDetection',
  region: aoi, scale: 10, maxPixels: 1e9
});
