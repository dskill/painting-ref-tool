# Converting painting-ref-tool to Watercolor Painting Alignment Tool

## Current State

We have a working document scanner (from tony-xlh/opencvjs-document-scanner) with minimal UI changes:
- ✅ Detects rectangular borders using OpenCV contour detection
- ✅ Crops and perspective-corrects images
- ✅ Live camera mode with real-time detection
- ✅ Manual border adjustment via PerspectiveViewer
- ✅ Works reliably on mobile (tested and confirmed)
- ✅ Canny edge detection toggle option

**Critical Working Setup** (DO NOT BREAK):
- OpenCV.js loaded as LAST script without `async` attribute
- `Module.onRuntimeInitialized()` callback pattern
- Non-blocking initialization (initDDV runs immediately)
- Local OpenCV.js file in `/dynamsoft-document-viewer/` directory
- Dynamsoft DDV library for camera/perspective editing

## Goal

Convert to a **dual-image watercolor painting alignment tool** that:
1. Accepts TWO images: Reference photo + Work-in-progress painting photo
2. Detects hand-drawn pencil borders on both images
3. Aligns both images to the same perspective/orientation
4. Overlays them for visual comparison
5. Allows opacity adjustment to see differences
6. Exports aligned images

## Conversion Steps

### Phase 1: Dual Image Input (FIRST CHANGE)

**Objective**: Support uploading two separate images

**Changes**:
1. Duplicate the image upload UI to have two sections:
   ```html
   <div class="image-section">
     <h3>📷 Reference Photo</h3>
     <button id="loadReferenceBtn">📁 Upload Reference</button>
     <img id="referencePhoto"/>
     <img id="referencePhotoRaw" style="display:none;"/>
   </div>

   <div class="image-section">
     <h3>🎨 Painting Photo</h3>
     <button id="loadPaintingBtn">📁 Upload Painting</button>
     <img id="paintingPhoto"/>
     <img id="paintingPhotoRaw" style="display:none;"/>
   </div>
   ```

2. Add separate file inputs:
   ```html
   <input style="display:none;" type="file" id="referenceFile"
          onchange="loadReferenceFromFile();" accept=".jpg,.jpeg,.png,.bmp" />
   <input style="display:none;" type="file" id="paintingFile"
          onchange="loadPaintingFromFile();" accept=".jpg,.jpeg,.png,.bmp" />
   ```

3. Add event listeners for both buttons:
   ```javascript
   document.getElementById("loadReferenceBtn").addEventListener("click", () => {
     document.getElementById("referenceFile").click();
   });

   document.getElementById("loadPaintingBtn").addEventListener("click", () => {
     document.getElementById("paintingFile").click();
   });
   ```

4. Create separate load functions:
   ```javascript
   function loadReferenceFromFile() {
     let fileInput = document.getElementById("referenceFile");
     // ... similar to existing loadImageFromFile()
     // Set referencePhoto and referencePhotoRaw src
   }

   function loadPaintingFromFile() {
     let fileInput = document.getElementById("paintingFile");
     // ... similar to existing loadImageFromFile()
     // Set paintingPhoto and paintingPhotoRaw src
   }
   ```

**Test**: Verify both images load independently without breaking existing detection

---

### Phase 2: Dual Detection & Processing

**Objective**: Detect and crop BOTH images

**Changes**:
1. Modify "Detect Border" button to process both:
   ```javascript
   document.getElementById("detectBtn").addEventListener("click", async function() {
     // Detect reference
     let refPoints = documentScanner.detect(
       document.getElementById("referencePhotoRaw"),
       getScanOptions()
     );
     let refCanvas = documentScanner.crop(
       document.getElementById("referencePhotoRaw"),
       refPoints
     );

     // Detect painting
     let paintingPoints = documentScanner.detect(
       document.getElementById("paintingPhotoRaw"),
       getScanOptions()
     );
     let paintingCanvas = documentScanner.crop(
       document.getElementById("paintingPhotoRaw"),
       paintingPoints
     );

     // Store both cropped canvases for overlay
     referenceCropped = refCanvas;
     paintingCropped = paintingCanvas;

     // Show in UI
     document.getElementById("referenceOutput").src = refCanvas.toDataURL();
     document.getElementById("paintingOutput").src = paintingCanvas.toDataURL();
   });
   ```

2. Update result display to show both outputs:
   ```html
   <div class="result">
     <div class="processed">
       <h3>✨ Aligned Reference</h3>
       <img id="referenceOutput"/>
     </div>
     <div class="processed">
       <h3>✨ Aligned Painting</h3>
       <img id="paintingOutput"/>
     </div>
   </div>
   ```

**Test**: Both images detect borders and crop correctly

---

### Phase 3: Image Overlay Comparison

**Objective**: Overlay aligned images with opacity control

**Changes**:
1. Add overlay canvas and controls:
   ```html
   <div class="overlay-section">
     <h3>🔍 Overlay Comparison</h3>
     <canvas id="overlayCanvas"></canvas>
     <div class="controls">
       <label>
         Painting Opacity:
         <input type="range" id="opacitySlider" min="0" max="100" value="50"/>
         <span id="opacityValue">50%</span>
       </label>
       <button id="generateOverlayBtn">Generate Overlay</button>
     </div>
   </div>
   ```

2. Implement overlay generation:
   ```javascript
   document.getElementById("generateOverlayBtn").addEventListener("click", () => {
     if (!referenceCropped || !paintingCropped) {
       alert("Please detect borders on both images first");
       return;
     }

     // Resize painting to match reference dimensions
     const canvas = document.getElementById("overlayCanvas");
     const ctx = canvas.getContext("2d");

     canvas.width = referenceCropped.width;
     canvas.height = referenceCropped.height;

     // Draw reference as base
     ctx.drawImage(referenceCropped, 0, 0);

     // Draw painting with opacity on top
     const opacity = document.getElementById("opacitySlider").value / 100;
     ctx.globalAlpha = opacity;
     ctx.drawImage(paintingCropped, 0, 0, canvas.width, canvas.height);
     ctx.globalAlpha = 1.0;
   });

   // Update overlay when opacity changes
   document.getElementById("opacitySlider").addEventListener("input", (e) => {
     document.getElementById("opacityValue").textContent = e.target.value + "%";
     // Regenerate overlay with new opacity
     document.getElementById("generateOverlayBtn").click();
   });
   ```

**Test**: Overlay shows both images with adjustable opacity

---

### Phase 4: Export Functionality

**Objective**: Save aligned images and overlay

**Changes**:
1. Add export buttons:
   ```html
   <div class="export-section">
     <button id="exportReferenceBtn">💾 Save Reference</button>
     <button id="exportPaintingBtn">💾 Save Painting</button>
     <button id="exportOverlayBtn">💾 Save Overlay</button>
   </div>
   ```

2. Implement download functions:
   ```javascript
   function downloadCanvas(canvas, filename) {
     const link = document.createElement('a');
     link.download = filename;
     link.href = canvas.toDataURL('image/png');
     link.click();
   }

   document.getElementById("exportReferenceBtn").addEventListener("click", () => {
     if (referenceCropped) {
       downloadCanvas(referenceCropped, 'reference-aligned.png');
     }
   });

   document.getElementById("exportPaintingBtn").addEventListener("click", () => {
     if (paintingCropped) {
       downloadCanvas(paintingCropped, 'painting-aligned.png');
     }
   });

   document.getElementById("exportOverlayBtn").addEventListener("click", () => {
     const canvas = document.getElementById("overlayCanvas");
     downloadCanvas(canvas, 'overlay-comparison.png');
   });
   ```

**Test**: All three export functions work correctly

---

### Phase 5: Enhanced Live Camera Mode

**Objective**: Allow capturing both images via camera

**Current Behavior**: Live camera captures one image
**Desired**: Capture reference first, then painting

**Changes**:
1. Add state tracking:
   ```javascript
   let captureMode = 'reference'; // or 'painting'
   ```

2. Update "Live Camera" button to indicate mode:
   ```javascript
   document.getElementById("liveScanBtn").addEventListener("click", function() {
     if (!document.getElementById("referencePhoto").src) {
       captureMode = 'reference';
       document.getElementById("liveScanBtn").textContent = "📷 Capture Reference";
     } else if (!document.getElementById("paintingPhoto").src) {
       captureMode = 'painting';
       document.getElementById("liveScanBtn").textContent = "📷 Capture Painting";
     }

     if (captureViewer) {
       detectHandler.setScanOptions(getScanOptions());
       document.getElementById("captureViewer").style.display = "block";
       captureViewer.play({fill:true});
     }
   });
   ```

3. Update captured event handler:
   ```javascript
   captureViewer.on("captured", async (e) => {
     captureViewer.stop();
     document.getElementById("captureViewer").style.display = "none";
     const pageData = captureViewer.currentDocument.getPageData(e.pageUid);
     const raw = await pageData.raw();
     let url = URL.createObjectURL(raw.data);

     if (captureMode === 'reference') {
       document.getElementById("referencePhoto").src = url;
       await loadImage(document.getElementById("referencePhotoRaw"), url);
       captureMode = 'painting';
     } else {
       document.getElementById("paintingPhoto").src = url;
       await loadImage(document.getElementById("paintingPhotoRaw"), url);
     }

     captureViewer.currentDocument.deleteAllPages();
   });
   ```

**Test**: Can capture both images sequentially via camera

---

### Phase 6: UI/UX Polish

**Objective**: Make it intuitive and visually appealing

**Changes**:
1. Add workflow guidance:
   ```html
   <div class="workflow-guide">
     <h3>📝 How to Use:</h3>
     <ol>
       <li>Upload or capture your <strong>reference photo</strong></li>
       <li>Upload or capture your <strong>painting photo</strong></li>
       <li>Click <strong>"Detect Border"</strong> on both images</li>
       <li>Use <strong>"Enable Editing"</strong> to manually adjust borders if needed</li>
       <li>Generate overlay to compare your work</li>
       <li>Adjust opacity to see differences</li>
       <li>Export aligned images</li>
     </ol>
   </div>
   ```

2. Add visual indicators for workflow state:
   ```javascript
   function updateWorkflowState() {
     const hasReference = document.getElementById("referencePhoto").src;
     const hasPainting = document.getElementById("paintingPhoto").src;
     const hasReferenceDetected = referenceCropped !== null;
     const hasPaintingDetected = paintingCropped !== null;

     // Enable/disable buttons based on state
     document.getElementById("detectBtn").disabled = !hasReference || !hasPainting;
     document.getElementById("generateOverlayBtn").disabled = !hasReferenceDetected || !hasPaintingDetected;

     // Update visual indicators
     // ... add checkmarks, colors, etc.
   }
   ```

3. Improve mobile layout:
   ```css
   @media (max-width: 768px) {
     .result {
       flex-direction: column;
     }

     .image-section {
       width: 100%;
       margin-bottom: 2rem;
     }
   }
   ```

---

## Technical Considerations

### Maintaining Working OpenCV Setup

**DO NOT CHANGE**:
- Script loading order in index.html (lines 121-332)
- `Module.onRuntimeInitialized()` callback (lines 130-138)
- OpenCV.js script tag location (line 302)
- Local Dynamsoft DDV library paths (lines 7-8, 142)

**Safe to Modify**:
- HTML structure and CSS styling
- Event handlers and business logic
- New variables and functions
- Image processing after OpenCV is loaded

### Image Resizing Strategy

When overlaying images of different sizes:
```javascript
function resizeToMatch(sourceCanvas, targetWidth, targetHeight) {
  const resized = document.createElement('canvas');
  resized.width = targetWidth;
  resized.height = targetHeight;
  const ctx = resized.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
  return resized;
}
```

### Error Handling

Add validation:
```javascript
function validateBothImagesLoaded() {
  if (!document.getElementById("referencePhoto").src) {
    alert("Please upload a reference photo first");
    return false;
  }
  if (!document.getElementById("paintingPhoto").src) {
    alert("Please upload a painting photo first");
    return false;
  }
  return true;
}
```

---

## Testing Strategy

1. **After each phase**: Test on mobile device (primary target)
2. **Incremental approach**: Make one change, test, commit
3. **Critical test cases**:
   - Both images load independently
   - Border detection works on both
   - Overlay generation works
   - Opacity slider responsive
   - Camera capture for both images
   - Export functions download correctly
   - App doesn't hang on startup (regression test)

---

## Future Enhancements (Post-MVP)

- **Grid overlay**: Add alignment grid on overlay for better comparison
- **Side-by-side mode**: Toggle between overlay and side-by-side view
- **Color difference map**: Highlight areas where colors differ significantly
- **History/sessions**: Save multiple reference-painting pairs
- **Pinch-to-zoom**: On mobile, zoom into overlay for detail inspection
- **Border color detection**: Auto-detect the border color (graphite vs ink)
- **Batch processing**: Upload multiple painting progress photos to compare over time

---

## Troubleshooting

### If app stops loading after changes:

1. Check browser console for errors
2. Verify script loading order hasn't changed
3. Ensure no JavaScript syntax errors
4. Test in incognito mode (bypass cache)
5. Compare against working commit

### If detection fails:

1. Try toggling "Enable Canny Edge Detection"
2. Ensure good lighting conditions
3. Check that border is clearly visible
4. Verify image isn't too low resolution

### If overlay looks wrong:

1. Verify both images were detected/cropped
2. Check canvas dimensions match
3. Ensure opacity value is between 0-100
4. Try regenerating overlay

---

## Implementation Order

**Priority 1** (Core functionality):
1. Phase 1: Dual image input
2. Phase 2: Dual detection
3. Phase 3: Overlay comparison

**Priority 2** (User experience):
4. Phase 4: Export functionality
5. Phase 6: UI/UX polish

**Priority 3** (Nice to have):
6. Phase 5: Enhanced camera mode
7. Future enhancements
