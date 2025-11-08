export interface Point {
  x: number;
  y: number;
}

export interface ScanOptions {
  useCanny?:boolean; // use Canny edge detection
}

export class DocumentScanner {
  private cv:any;
  constructor() {
    if (!("cv" in window)) {
      throw new Error("OpenCV not found");
    }else{
      this.cv = window["cv"];
    }
  }

  detect(source:HTMLImageElement|HTMLCanvasElement,options?:ScanOptions):Point[]{
    let useCanny = false;
    if (options && options.useCanny === true) { //canny is disabled by default
      useCanny = true;
    }
    let cv = this.cv;
    const img = cv.imread(source);
    const gray = new cv.Mat();
    if (useCanny) {
      cv.Canny(img, gray, 50, 200);
    }else{
      cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY);
    }
    const blur = new cv.Mat();
    cv.GaussianBlur(gray,blur,new cv.Size(3, 3),0,0,cv.BORDER_DEFAULT);
    const thresh = new cv.Mat();
    cv.threshold(blur,thresh,0,255,cv.THRESH_OTSU);
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    cv.findContours(thresh,contours,hierarchy,cv.RETR_CCOMP,
      cv.CHAIN_APPROX_SIMPLE);

    let maxArea = 0;
    let maxContourIndex = -1;
    for (let i = 0; i < contours.size(); ++i) {
      let contourArea = cv.contourArea(contours.get(i));
      if (contourArea > maxArea) {
        maxArea = contourArea;
        maxContourIndex = i;
      }
    }

    const maxContour = contours.get(maxContourIndex);
    const points = this.getCornerPoints(maxContour)
    img.delete();
    gray.delete();
    blur.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();
    return points;
  }

  crop(source:HTMLImageElement|HTMLCanvasElement,points?:Point[],width?:number,height?:number):HTMLCanvasElement{
    const cv = this.cv;
    const canvas = document.createElement("canvas");
    const img = cv.imread(source);
    if (!points) {
      points = this.detect(source);
    }
    let warpedDst = new cv.Mat();
    if (!width) {
      width = Math.max(this.distance(points[0],points[1]),this.distance(points[2],points[3]));
    }
    if (!height) {
      height = Math.max(this.distance(points[0],points[3]),this.distance(points[1],points[2]));
    }
    let dsize = new cv.Size(width, height);
    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      points[0].x,
      points[0].y,
      points[1].x,
      points[1].y,
      points[3].x,
      points[3].y,
      points[2].x,
      points[2].y,
    ]);

    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0,
      0,
      width,
      0,
      0,
      height,
      width,
      height,
    ]);

    let M = cv.getPerspectiveTransform(srcTri, dstTri);
    cv.warpPerspective(img,warpedDst,M,dsize,cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar()
    );

    cv.imshow(canvas, warpedDst);
    img.delete()
    warpedDst.delete()
    return canvas;
  }

  distance(p1:Point, p2:Point) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  getCornerPoints(contour:any):Point[] {
    let cv = this.cv;

    // Approximate the contour to reduce noise
    let approx = new cv.Mat();
    let peri = cv.arcLength(contour, true);
    cv.approxPolyDP(contour, approx, 0.02 * peri, true);

    // If we got 4 points from approximation, use those
    let cornerPoints:Point[] = [];
    if (approx.data32S.length === 8) { // 4 points * 2 coordinates
      for (let i = 0; i < 8; i += 2) {
        cornerPoints.push({ x: approx.data32S[i], y: approx.data32S[i + 1] });
      }
    } else {
      // Fallback: get 4 corners from minAreaRect
      let rect = cv.minAreaRect(contour);
      let vertices = cv.RotatedRect.points(rect);
      for (let i = 0; i < vertices.length; i++) {
        cornerPoints.push({ x: vertices[i].x, y: vertices[i].y });
      }
    }

    approx.delete();

    // Sort points: top-left, top-right, bottom-right, bottom-left
    // First, find the center
    const centerX = cornerPoints.reduce((sum, p) => sum + p.x, 0) / 4;
    const centerY = cornerPoints.reduce((sum, p) => sum + p.y, 0) / 4;

    // Classify each point by quadrant and distance from center
    let topLeft = null, topRight = null, bottomLeft = null, bottomRight = null;
    let tld = 0, trd = 0, bld = 0, brd = 0;

    for (const point of cornerPoints) {
      const dist = this.distance(point, {x: centerX, y: centerY});

      if (point.x < centerX && point.y < centerY) {
        // Top-left quadrant
        if (!topLeft || dist > tld) {
          topLeft = point;
          tld = dist;
        }
      } else if (point.x >= centerX && point.y < centerY) {
        // Top-right quadrant
        if (!topRight || dist > trd) {
          topRight = point;
          trd = dist;
        }
      } else if (point.x < centerX && point.y >= centerY) {
        // Bottom-left quadrant
        if (!bottomLeft || dist > bld) {
          bottomLeft = point;
          bld = dist;
        }
      } else {
        // Bottom-right quadrant
        if (!bottomRight || dist > brd) {
          bottomRight = point;
          brd = dist;
        }
      }
    }

    return [
      topLeft || cornerPoints[0],
      topRight || cornerPoints[1],
      bottomRight || cornerPoints[2],
      bottomLeft || cornerPoints[3]
    ];
  }
}