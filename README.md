# Dera Baba Nanak(Gurdaspur) Flood-Damaged Paddy Analysis 

Flood damage assessment of paddy (rice) cropland in the Dera Baba Nanak block, Gurdaspur district, Punjab, following the August 2025 Punjab floods. This is the second region in an ongoing series of independent geospatial monitoring projects (see the first: [Naughar_Crop_Monitoring](https://github.com/KK-2204/Naughar_Crop_Monitoring)), extending the same methodology to a disaster-response use case and testing whether earlier findings were region-specific.

## Files

1. **`Gurdaspur_Flood_Detection.js`** — Google Earth Engine script covering the full pipeline: AOI setup, 3-date NDVI (pre-flood / peak-flood / recovery), NDWI, vegetation loss change detection, and two independent SAR (Sentinel-1) flood detection methods with a full statistical comparison.
2. **`CNN_Land_Classification_Gurdaspur.ipynb`** — Cross-region test of the MobileNetV2 + EuroSAT land cover classifier originally trained and validated in the Naugarh project, re-applied here unchanged to test whether its limitations generalize.

## Key Findings

- **Optical imagery has a real blind spot during disaster response**: only 2 cloud-free Sentinel-2 images were available during the peak flood window, covering just ~75% of the study area. SAR (radar), which penetrates cloud cover, was needed as the primary flood detection method.
- **Two SAR flood detection methods were compared**: a simple backscatter threshold (which conflates the permanent river with new flooding) versus before/after change detection (which isolates genuinely new flooding). The change-detection method's result ~3,915 ha flooded (16.5% of the study area), closely matched independently reported district wide flood damage (~15% of Gurdaspur district), while the simpler threshold method undercounted.
- **Optical imagery alone would have missed roughly half of the true flooded area** during the critical peak-flood window, a quantified not just qualitative case for using radar in monsoon-season disaster assessment.
- **Cross-region model test**: re-running the Naugarh CNN classifier here found 0 of 5 tiles labeled "River" were confirmed as real water even though this AOI, contains an actual river. This is stronger evidence of a systematic water-detection weakness in the underlying model, not a one-off artifact of a single region lacking water.

## Study Area

Dera Baba Nanak block, Gurdaspur district, Punjab AOI: `[74.95, 31.90, 75.12, 32.034]` (~239 km²), covering Ghuman, Talwandi Rama, Kotli Surat Malhi, and Veela Teja.

## Full Write-Up

https://docs.google.com/document/d/1caZMHggRbe1B7Em8h8ZeyWaAd5hZB5dH0PEW90_wHZI/edit?usp=sharing

## Related Naugarh Project

https://github.com/KK-2204/Naughar_Crop_Monitoring
