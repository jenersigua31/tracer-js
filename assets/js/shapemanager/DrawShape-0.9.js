//-------------------------------------------------------------------------------------------------
//  ShapeDrawer
//
//      drawing shapes in one of two modes:
//      with 4 spline pints or with 72 continous points
//
//-------------------------------------------------------------------------------------------------
//  Author: NOW Development Team
//  Versions:
//      V0.9    2015/07/17  First release
//
//-------------------------------------------------------------------------------------------------
'use strict';
function ShapeDrawer(shapeData1, canvasWidth, canvasHeight) {
    //var selector = null;
    var self = this;

    var drawing = false;
    var hasDraw = false;
    var xOffset;
    var yOffset;
    var posX;
    var posY;
    var sizeX;
    var sizeY;
    var scaleX;
    var scaleY;
    var centerLine;
    var shiftPressed = false;
    var r;
    var ctrlPointsVisual = [];
    var paperOffset;
    var margin = 10.0; // mm
    
    //var bbox;
    var viewbox = [];
    var mdown;
    var shapeDataLocal;
    //var drawMode = 0; // 0=Spline, 1=Rubber
    var spline;
    var rubber;
    var scaleB = 1.0;
    var shapePath;  // spline or rubber path
    var shapePathR; // oma shape R
    var shapePathL; // oma shape L
    var logtxt = '';
    var lastIndexModified = -1;
    var modDirection = 0;

    // constructor
    try {
        shapeDataLocal = shapeData1;
        //selector = null;
        //var selecting = false;
        shiftPressed = false;
        ctrlPointsVisual = [];

        spline = new Spline();
        rubber = new Rubber();
        //canvasWidth = jQuery('.SplineBenchDiv').clientWidth;
        //canvasHeight = jQuery('.SplineBenchDiv').clientHeight;
        //bbox = { x: 0, y: 0, width: canvasWidth, height: canvasHeight };

        viewbox = [0, 0, canvasWidth, canvasHeight];
        mdown = function (e) {
            var evt = e ? e : window.event;
            shiftPressed = evt.shiftKey;
        };

    } catch (e) {
        console.log(e.toString());
    }

    function dragger() {
        if (!this.isSelected_) {
            if (!shiftPressed)
                deselectAll();
            this.selected_(true);
        } else {
            if (shiftPressed)
                this.selected_(false);
        }
        for (var i in ctrlPointsVisual) {
            if (ctrlPointsVisual.hasOwnProperty(i)) {
                var p = ctrlPointsVisual[i];
                if (p.isSelected_) {
                    p.data.startmove();
                }
            }
        }
    }

    function move(dx, dy) {


        dx /= scaleB;
        dy /= scaleB;

        for (var i in ctrlPointsVisual) {
            if (ctrlPointsVisual.hasOwnProperty(i)) {
                var p = ctrlPointsVisual[i];
                if (p.isSelected_) {
                    p.data.move({ dx: dx, dy: dy });
                }
            }
        }
    }

    function up() {
    }

    function deselectAll() {
        for (var x in ctrlPointsVisual) {
            if (ctrlPointsVisual.hasOwnProperty(x)) {
                ctrlPointsVisual[x].selected_(false);
            }
        }
    }

    function selected(isSelected) {
        if (isSelected)
            this.attr({ fill: '#00FF00', 'fill-opacity': 0.7 });
        else
            this.attr({ fill: '#FFFFFF', 'fill-opacity': 1 });
        this.isSelected_ = isSelected;
    }

    function addCtrlPointVisual(cp) {
        var pos = cp.position();
        var p;
        if (cp.ctrlType === 'P') {
            p = r.ellipse(pos.x, pos.y, 2, 2);
            p.attr({ fill: 'red', stroke: 'blue', 'fill-opacity': 0, 'stroke-width': 0.5, cursor: 'move' });
        } else {
            p = r.rect(pos.x - 1, pos.y - 1, 2, 2);
            if (cp.isA)
                p.attr({ fill: 'red', stroke: 'orange', 'fill-opacity': 0, 'stroke-width': 0.5, cursor: 'move' });
            else
                p.attr({ fill: 'red', stroke: 'green', 'fill-opacity': 0, 'stroke-width': 0.5, cursor: 'move' });
        }

        if (cp.parent !== undefined) {
            var dep = cp.parent;
            var pos2 = dep.position();
            var line = r.path('M' + (pos.x) + ' ' + (pos.y) + 'L' + pos2.x + ' ' + pos2.y).toBack();
            line.attr({ stroke: 'black', 'stroke-width': 0.5 });
            cp.line = line;
        }

        p.data = cp;
        p.mousedown(mdown);
        p.drag(move, dragger, up);
        p.selected_ = selected;
        p.isSelected_ = false;

        cp.positionChanged = function () {
            var newPos = cp.position();
            var att = p.type === 'rect' ? { x: newPos.x - 1, y: newPos.y - 1 } : { cx: newPos.x, cy: newPos.y };
            p.attr(att);
            if (cp.line !== undefined)
                cp.line.remove();
            if (cp.parent !== undefined) {
                var dep = cp.parent;
                var pos2 = dep.position();
                var line = r.path('M' + newPos.x + ' ' + newPos.y + 'L' + pos2.x + ' ' + pos2.y).toBack();
                line.attr({ stroke: 'black', 'stroke-width': 0.5 });
                cp.line = line;
            }

            drawSpline();
        };
        ctrlPointsVisual.push(p);
    }

    function addSplinePointVisual(sp) {
        addCtrlPointVisual(sp.P);
        addCtrlPointVisual(sp.A);
        addCtrlPointVisual(sp.B);
    }
    self.DeleteSpLine = function () {
        deleteSpline();
    }

    function deleteSpline() {
        //for (var i = segments.length - 1; i >= 0; i--) {
        //    segments[i].remove();
        //}
        //segments.length = 0;
        if (shapePath)
            shapePath.remove();
    }

    function drawSpline() {
        deleteSpline();
        var path = '';
        for (var i = 0, ii = spline.splinePoints.length; i < ii; i++) {
            var nextSp = spline.splinePoints[(i + 1) % spline.splinePoints.length];
            var sP = spline.splinePoints[i];
            var p = sP.P.position();
            var pn = nextSp.P.position();
            var pAn = nextSp.A.position();
            var pb = sP.B.position();
            if (i === 0)
                path += 'M' + p.x + ' ' + p.y;
            path += 'C' + pb.x + ' ' + pb.y + ' ' + pAn.x + ' ' + pAn.y + ' ' + pn.x + ' ' + pn.y;
        }
        shapePath = r.path(path).toBack();
        shapePath.attr({ stroke: 'blue', 'stroke-width': 0.5 });
    }

    function drawRubber() {
        deleteSpline();
        var path = '';
        for (var i = 0; i < 72; i++) {
            var p = rubber.Rub(i);
            if (i === 0)
                path += 'M' + p.x + ' ' + p.y;
            else
                path += 'L' + p.x + ' ' + p.y;
        }
        path += 'z';
        shapePath = r.path(path).toBack();
        shapePath.attr({ stroke: 'blue', 'stroke-width': 0.5, fill: '#0000FF', 'fill-opacity': 0.5 });
        hasDraw = true;
    }

    function setupRubber() {
        //setOffsetsETC();
        var thecanvas = r.rect(viewbox[0], viewbox[1], viewbox[2], viewbox[3]).attr({ fill: '#FFFF00', opacity: 0 });
        thecanvas.attr({ cursor: 'crosshair' });

        var start = function (dx, dy, evt) {

            var bnds = evt.target.getBoundingClientRect();
            posX = (evt.clientX - bnds.left) / bnds.width * viewbox[2] - viewbox[2] / 2.0;
            posY = (evt.clientY - bnds.top) / bnds.height * viewbox[3] - viewbox[3] / 2.0;

            drawing = true;
        };

        var moveRubber = function (dx, dy) {
            dx /= scaleB;
            dy /= scaleB;
            if (drawing) {
                //if (shiftPressed)

                rubber.P = { x: posX + dx, y: (posY + dy) };
            }
        };

        var upRubber = function () {
            drawing = false;
            lastIndexModified = -1;
        };

        thecanvas.drag(moveRubber, start, upRubber);
        thecanvas.mousedown(mdown);
    }

    function GetAltitude(x1, y1, x2, y2, x3, y3) {
        // A = 1/2 * |xA(yB−yC)+xB(yC−yA)+xC(yA−yB)|

        var A = 0.5 * Math.abs(x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
        var a = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));

        return 1.0 * A / a;
    }

    function GetRadius3P(x1, y1, x2, y2, x3, y3) {
        // see: http://delphi.zsg-rottenburg.de/faqmath4.html

        var u = 0.0;
        u += (y2 - y3) * (x1 * x1 + y1 * y1);
        u += (y3 - y1) * (x2 * x2 + y2 * y2);
        u += (y1 - y2) * (x3 * x3 + y3 * y3);

        var v = 0;
        v += (x3 - x2) * (x1 * x1 + y1 * y1);
        v += (x1 - x3) * (x2 * x2 + y2 * y2);
        v += (x2 - x1) * (x3 * x3 + y3 * y3);

        var d = x1 * y2 + x2 * y3 + x3 * y1 - (x1 * y3 + x2 * y1 + x3 * y2);

        if (d === 0) return 0.0;

        var x = u / (2 * d);
        var y = v / (2 * d);

        var r = Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));

        return r;
    }

    function CalcSplinePointFromShape(quadrant) {
        var noOfPoints = shapeDataLocal.radiiR.length;
        var noOfPoints4 = noOfPoints / 4;
        var minCrv = Math.PI + 0.1;
        var p1;
        var idxSelected = -1;
        for (var idx = quadrant * noOfPoints4 + 1; idx < ((quadrant + 1) * noOfPoints4) ; idx++) {
            var pI = shapeDataLocal.radiiR[(noOfPoints + idx) % noOfPoints];
            var pA = shapeDataLocal.radiiR[(noOfPoints + idx - 50) % noOfPoints];
            var pB = shapeDataLocal.radiiR[(noOfPoints + idx + 50) % noOfPoints];

            var a1 = Math.atan2((pI.y - pA.y), (pI.x - pA.x));
            if (a1 < 0) a1 += Math.PI * 2.0;
            if (a1 > Math.PI)
                a1 -= Math.PI;
            var a2 = Math.atan2((pB.y - pI.y), (pI.x - pB.x));
            if (a2 < 0) a2 += Math.PI * 2.0;
            if (a2 > Math.PI)
                a2 -= Math.PI;
            var crv = a1 + a2;

            logtxt += idx.toFixed(0) + ': ' + crv.toFixed(1) + '\n';
            if (crv < minCrv) {
                p1 = pI;
                minCrv = crv;
                idxSelected = idx;
                //var a3 = Math.atan2((pB.y - pA.y), (pB.x - pA.x)); // angle of tangent
                //p1.tan = a3;
            }
            if (idx > 7.0 * noOfPoints / 8.0)
                break;
        }
        var nsp = spline.addSplinePoint(p1.x, -p1.y);
        nsp.shapeIdx = idxSelected;
        return nsp;
    }

    function splineChanged() {
        deleteAllCtrlPointsVisual();
        for (var i = 0, ii = spline.splinePoints.length; i < ii; i++) {
            var sP = spline.splinePoints[i];
            addSplinePointVisual(sP);
        }
        drawSpline();
    }

    function deleteAllCtrlPointsVisual() {
        for (var i = ctrlPointsVisual.length - 1; i >= 0; i--) {
            ctrlPointsVisual[i].remove();
        }
        ctrlPointsVisual.length = 0;
    }

    function setupCanvas(el, w, h) {
        
        r = Raphael(el, w, h);
        //r.canvas.id = 'shapeDrawerSVG';
        //setupSelector();
    }

    function GetRPrect(theRect, axe) {
        if (axe === 'x') return theRect.attr('x') + theRect.attr('r');
        if (axe === 'y') return theRect.attr('y') + theRect.attr('r');
    }

    function setOffsetsETC() {
        var drawCanvas = jQuery('.SplineBenchDiv');
        paperOffset = drawCanvas.offset();
        xOffset = paperOffset.left;
        yOffset = paperOffset.top;
    }

    function Rubber() {
        var self = this;
        var rubPoints = []; // 72 points at 5° each
        function RubPoint(idx, rad) {
            var self = this;
            var parentSelf = self;
            self.idx = idx;
            self.rad = 0.0;
            self.phi = 0.0;
            self.x = 0.0;
            self.y = 0.0;

            Object.defineProperty(self, 'Rad', {
                set: function (rad__) {
                    parentSelf.rad = rad__;
                    parentSelf.phi = Math.PI * parentSelf.idx / 36.0;
                    parentSelf.x = rad__ * Math.cos(parentSelf.phi);
                    parentSelf.y = rad__ * Math.sin(parentSelf.phi);
                }
            });

            // constructor
            if (rad !== undefined)
                self.Rad = rad;
        }

        self.Rub = function (idx) {
            if ((idx < 0) || (idx > rubPoints.length))
                return null;
            return rubPoints[idx];
        };

        Object.defineProperty(self, 'P', {
            set: function (p) {
                var r = Math.sqrt(p.x * p.x + p.y * p.y);
                var phi = Math.atan2(p.y, p.x);
                if (phi < 0) phi += Math.PI * 2.0;
                var idx = parseInt((phi * 36.0 / Math.PI));

                modDirection = (((idx - lastIndexModified + 72) % 72) < 36) ? 1 : -1;
                
                for (var i = (lastIndexModified < 0) ? idx : lastIndexModified; 1; i = ((72 + i + modDirection) % 72)) {
                    self.Rub(i).Rad = r;
                    if (i === idx || idx >= 72)
                        break;
                }
                lastIndexModified = idx;

                drawRubber();
            }
        });
        // constructor
        for (var i = 0; i < 72; i++)
            rubPoints.push(new RubPoint(i, 0.0));
    }
    // class Spline to handle all the math. Indipendent from visual presentation
    function Spline() {
        var self = this;

        function splinePoint(x, y, idx) {
            var self = this;

            self.idx = idx;

            function CtrlPoint(px, py, cType, idx_) {
                var self = this;

                if (idx_ !== undefined)
                    self.idx = idx_;

                self.isA = false;
                //self.parent;
                self.ctrlType = '0';
                self.position_ = { x: 0.0, y: 0.0 };
                self.origin_ = { x: 0.0, y: 0.0 }; // origin for a move
                self.dependencies = [];

                // constructor
                self.position_ = { x: px, y: py };
                self.origin_ = { x: px, y: py };
                self.ctrlType = cType;
                self.position = function (p) {
                    if (p !== undefined && p !== null) {
                        self.position_ = { x: p.x, y: p.y };
                        self.positionChanged();
                    }
                    return self.position_;
                };
                self.origin = function (p) {
                    if (p !== undefined && p !== null)
                        self.origin_ = { x: p.x, y: p.y };
                    return self.origin_;
                };
                self.startmove = function (isSubmove) {
                    self.origin(self.position_);
                    if (!isSubmove) {
                        if (self.ctrlType === 'C')
                            self.dependencies[0].startmove(true);
                        else
                            for (var i = 0; i < self.dependencies.length; i++)
                                self.dependencies[i].startmove(true);
                    }
                };
                self.move = function (p, isSubmove) {
                    self.position({ x: self.origin_.x + p.dx, y: self.origin_.y + p.dy });
                    if (!isSubmove) {
                        if (self.ctrlType === 'C') {
                            var ang = Math.atan2(self.parent.position().y - self.position().y, self.parent.position().x - self.position().x);
                            //ang += Math.PI;
                            //if (ang > 2 * Math.PI)
                            //    ang -= 2 * Math.PI
                            var dx = self.dependencies[0].parent.position().x - self.dependencies[0].position().x;
                            var dy = self.dependencies[0].parent.position().y - self.dependencies[0].position().y;
                            var len = Math.sqrt(dx * dx + dy * dy);
                            var nx = self.dependencies[0].parent.position().x + len * Math.cos(ang);
                            var ny = self.dependencies[0].parent.position().y + len * Math.sin(ang);
                            var np = { x: nx, y: ny };
                            self.dependencies[0].position(np);
                            //self.dependencies[0].move({ dx: -p.dx, dy: -p.dy }, true);
                        } else
                            for (var i = 0; i < self.dependencies.length; i++)
                                self.dependencies[i].move(p, true);
                    }
                };
                self.positionChanged = function () {
                };
            }

            // constructor
            self.P = new CtrlPoint(x, y, 'P', self.idx);
            self.A = new CtrlPoint(x - 40.0, y - 40.0, 'C');
            self.A.isA = true;
            self.B = new CtrlPoint(x + 40.0, y + 40.0, 'C');
            // if point is moving, then move also the ctrl points!
            self.P.dependencies.push(self.A);
            self.P.dependencies.push(self.B);
            self.A.parent = self.P;
            self.B.parent = self.P;
            // if point A is moving, then move also point B and vice vers
            self.A.dependencies.push(self.B);
            self.B.dependencies.push(self.A);
        }

        self.splinePoints = [];

        self.addSplinePoint = function (x, y) {
            var nsp = new splinePoint(x, y, self.splinePoints.length);
            self.splinePoints.push(nsp);
            self.collectionChanged();
            return nsp;
        };
        self.collectionChanged = function () { };

        // constructor
        {
        }


        self.CalcCtrlPoints = function (idx) {
            var l = self.splinePoints.length;

            var p = self.splinePoints[idx].P.position();
            var pv = self.splinePoints[(idx + l - 1) % l].P.position();
            var pn = self.splinePoints[(idx + 1) % l].P.position();

            self.CalcCtrlPoint(p, pv, pn, self.splinePoints[idx].A, self.splinePoints[idx].B);
        };

        self.CalcCtrlPoint = function (p, pv, pn, a, b) {
            var R = 40.0;
            var S = 40.0;

            var Vvn = { x: 0.0, y: 0.0 };
            var Vpn = { x: 0.0, y: 0.0 };
            var Vpv = { x: 0.0, y: 0.0 };
            var Ph = { x: 0.0, y: 0.0 };
            var V1 = { x: 0.0, y: 0.0 };
            var V2 = { x: 0.0, y: 0.0 };

            Vvn.x = pn.x - pv.x;
            Vvn.y = pn.y - pv.y;
            Vpn.x = p.x - pn.x;
            Vpn.y = p.y - pn.y;
            Vpv.x = p.x - pv.x;
            Vpv.y = p.y - pv.y;
            Ph.x = pv.x + Vvn.x / 2.0;
            Ph.y = pv.y + Vvn.y / 2.0;
            V1.x = p.x - Ph.x;
            V1.y = p.y - Ph.y;
            V2.x = V1.y;
            V2.y = -V1.x;

            // normalize:
            var lenV2 = Math.sqrt(V2.x * V2.x + V2.y * V2.y);
            V2.x = V2.x / lenV2;
            V2.y = V2.y / lenV2;

            var lenVpn = Math.sqrt(Vpn.x * Vpn.x + Vpn.y * Vpn.y);
            var lenVpv = Math.sqrt(Vpv.x * Vpv.x + Vpv.y * Vpv.y);

            R = lenVpv / 4.0;
            S = lenVpn / 4.0;

            var ax = p.x + V2.x * R;
            var ay = p.y + V2.y * R;
            var bx = p.x - V2.x * S;
            var by = p.y - V2.y * S;

            b.position({ x: ax, y: ay });
            a.position({ x: bx, y: by });
        };
        self.guessAllCtrlPoints = function () {
            var l = self.splinePoints.length;
            for (var idx = 0; idx < l; idx++) {
                var p1 = self.splinePoints[idx].P;
                var p2 = self.splinePoints[(idx + 1) % l].P;
                var pv = self.splinePoints[(idx + l - 1) % l].P;
                var pn = self.splinePoints[(idx + 2) % l].P;
                var smooth = (p1.smooth) ? p1.smooth : 0.5;

                guessCtrlPoints(pv.position(), p1.position(), p2.position(), pn.position(), self.splinePoints[idx].B.position(), self.splinePoints[(idx + 1) % l].A.position(), smooth);
            }
        };

        function guessCtrlPoints(pV, p1, p2, pN, ctrl1, ctrl2, smoothValue) {

            var xc1 = (pV.x + p1.x) / 2.0;
            var yc1 = (pV.y + p1.y) / 2.0;
            var xc2 = (p1.x + p2.x) / 2.0;
            var yc2 = (p1.y + p2.y) / 2.0;
            var xc3 = (p2.x + pN.x) / 2.0;
            var yc3 = (p2.y + pN.y) / 2.0;

            var len1 = Math.sqrt((p1.x - pV.x) * (p1.x - pV.x) + (p1.y - pV.y) * (p1.y - pV.y));
            var len2 = Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
            var len3 = Math.sqrt((pN.x - p2.x) * (pN.x - p2.x) + (pN.y - p2.y) * (pN.y - p2.y));

            var k1 = len1 / (len1 + len2);
            var k2 = len2 / (len2 + len3);

            var xm1 = xc1 + (xc2 - xc1) * k1;
            var ym1 = yc1 + (yc2 - yc1) * k1;

            var xm2 = xc2 + (xc3 - xc2) * k2;
            var ym2 = yc2 + (yc3 - yc2) * k2;

            ctrl1.x = xm1 + (xc2 - xm1) * smoothValue + p1.x - xm1;
            ctrl1.y = ym1 + (yc2 - ym1) * smoothValue + p1.y - ym1;

            ctrl2.x = xm2 + (xc2 - xm2) * smoothValue + p2.x - xm2;
            ctrl2.y = ym2 + (yc2 - ym2) * smoothValue + p2.y - ym2;
        }
    }

    self.goFullScreen = function (StandAloneMode) {

        var element = jQuery('#splineBenchDiv')[0];

        /* Hiding header & topcontrol*/
        if(!StandAloneMode){
        jQuery('#OpticianHeader')[0].style.display = "none";
        jQuery('#topcontrol')[0].style.display = "none";
            /////////////////    
        }


        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
        
        var canvasWidth = element.clientHeight ;
        var canvasHeight = element.clientWidth ;

        //element.className = "splineBenchDiv";

        // $('.splineBenchDiv').ready(function () {
            r = Raphael(jQuery('.SplineBenchDivFullScreen')[0], canvasWidth, canvasHeight);
            r.clear();
            r.canvas.parentNode.removeChild(r.canvas);

            setupCanvas(element, window.innerWidth /1.4, window.innerHeight - 50);

            scaleB = 1;
            sizeX = window.innerWidth/1.4;
            sizeY = window.innerHeight;
            viewbox = [-sizeX / 2, -sizeY / 2, sizeX, sizeY];
            r.setViewBox.apply(r, viewbox);
            centerLine = r.path('M' + (-sizeX / 2) + ' 0 L' + sizeX / 2 + ' 0 M0 ' + (-sizeY / 2) + ' L0 ' + (sizeY / 2));
            centerLine.attr({ stroke: 'black', 'stroke-width': 1.0, "stroke-dasharray": '--.' });

 
            rubber = new Rubber();
            //var radii = [2602, 2452, 2281, 2140, 2020, 1930, 1849, 1792, 1753, 1723, 1711, 1716, 1724, 1748, 1789, 1831, 1888, 1961, 2035, 2123, 2229, 2329, 2451, 2568, 2700, 2826, 2961, 3085, 3216, 3305, 3369, 3391, 3409, 3416, 3424, 3421, 3430, 3412, 3416, 3378, 3354, 3301, 3235, 3179, 3083, 2983, 2890, 2794, 2714, 2638, 2574, 2523, 2474, 2441, 2416, 2398, 2397, 2400, 2415, 2448, 2481, 2538, 2596, 2674, 2752, 2848, 2925, 2996, 2996, 2971, 2874, 2765];
            for (var i = 0; i < 72; i++)
                rubber.Rub(i).Rad = 0.0;//(0.01 * radii[i]);
            //drawRubber();
            setupRubber();

            /* Showing fullScreen div to ease exiting the fullscreen mode */
            var fullScreenButton = jQuery('#fullscreenTool')[0];
            fullScreenButton.style.potition = "fixed";
            fullScreenButton.style.bottom = 0;
            fullScreenButton.style.right = 0;
            element.appendChild(fullScreenButton);


        //});
      
    };

    self.exitFullScreen = function (doExit) {
        
        if (doExit) {
            //vm.UnBlockPanel('divShapes');
            if (
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
            ) {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        }

        if ((document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement !== null)
            && (document.webkitIsFullScreen === false
              || document.mozFullScreen === false
              || document.msFullscreenElement === false)) {


        }

        hasDraw = false;
        var list = jQuery('#splineBenchDiv')[0];   // Get the <ul> element with id="myList"
        list.removeChild(list.childNodes[0]);
        // vm.isFullScreen = false;


    };

    self.hasDrawing = function (){
        if (hasDraw){
            return true;
        }
        else{
            return false;
        }

    };

    self.getOMA = function (noOfPoints) {

        var oma = 'TRCFMT=1;' + noOfPoints + ';U;R;P\n';
        var rads = 'R=';
        var angs = 'A=';
        var absoluteCenterX = 0;
        var absoluteCenterY = 0;
        // first intersect "rays" with the path.
        // search for the center and go in even steps of angles  

        var pathSrc = shapePath.attr('path');
        var bbox = Raphael.pathBBox(pathSrc);
        var hbox = 'HBOX=' + bbox.width + ';' + bbox.width;
        var vbox = 'VBOX=' + bbox.height + ';' + bbox.height;
        var rayLen = Math.max(bbox.width, bbox.height);
        var centerX = (bbox.x + (bbox.width / 2));
        var centerY = (bbox.y + (bbox.height / 2));

        // carbonea 10/05/2017: Center shape after publishing (only for continuous drawing)
        if (pathSrc.length >= noOfPoints) {
            for (var i = 0; i < pathSrc.length; i++) {

                pathSrc[i][1] += (absoluteCenterX - centerX);
                pathSrc[i][2] += (absoluteCenterY - centerY);
            }
            ////
        }

        var phiStep = (Math.PI * 2.0) / noOfPoints;

        for (var i = 0; i < noOfPoints; i++) {
            var ray = 'M' + centerX + ' ' + centerY;
            var lX = rayLen * Math.cos(phiStep * i);
            var lY = rayLen * Math.sin(phiStep * i);
            ray += 'l' + lX + ' ' + lY;

            var inter = Raphael.pathIntersection(pathSrc, ray);
            if (inter.length === 0) {
                break;
            }
            var r = Math.sqrt(inter[0].x * inter[0].x + inter[0].y * inter[0].y);
            var p = Math.atan2(-inter[0].y, inter[0].x);
            if (p <= 0) p += 2 * Math.PI;
            p = p * 180.0 / Math.PI;
            rads += (r * 100.0).toFixed(0);
            angs += (p * 100.0).toFixed(0);
            if (i < noOfPoints - 1) {
                rads += ';';
                angs += ';';
            }
        }
        oma += hbox + '\n';
        oma += vbox + '\n'
        oma += rads + '\n';
        oma += angs + '\n';
        hasDraw = false;

        return oma;
    };

    self.SetShape = function (sides)  // sides: R/L/B
    {
        r.clear();
        var dataR = '';
        var dataL = '';
        var fpd = shapeDataLocal.fpd();
        if (sides !== 'B')
            fpd = 0;
        var actrad;
        var centerR;
        if (sides !== 'L') {
            for (actrad in shapeDataLocal.radiiR) {
                if (shapeDataLocal.radiiR.hasOwnProperty(actrad)) {
                    dataR += ((actrad === '0') ? 'M' : 'L') + (shapeDataLocal.radiiR[actrad].x.toFixed(2) + ' ' + shapeDataLocal.radiiR[actrad].y.toFixed(2) + ' ');
                }
            }
            dataR += ' z';
            shapePathR = r.path(dataR).toBack();
            shapePathR.attr({ fill: 'red', stroke: 'black', 'fill-opacity': 0.1, 'stroke-width': 0.5 });
            centerR = r.path('M-10 0 L10 0 M0 -10 L0 10');
            centerR.attr({ fill: 'red', stroke: 'blue', 'fill-opacity': 0, 'stroke-width': 0.5 });
        }
        var centerL;
        if (sides !== 'R') {
            for (actrad in shapeDataLocal.radiiL) {
                if (shapeDataLocal.radiiL.hasOwnProperty(actrad)) {
                    dataL += ((actrad === '0') ? 'M' : 'L') + ((shapeDataLocal.radiiL[actrad].x + fpd).toFixed(2) + ' ' + shapeDataLocal.radiiL[actrad].y.toFixed(2) + ' ');
                }
            }
            dataL += ' z';
            centerL = r.path('M' + (fpd - 10).toFixed(2) + ' 0 L' + (fpd + 10).toFixed(2) + ' 0 M-10 ' + fpd.toFixed(2) + ' L10 ' + fpd.toFixed(2));
            centerL.attr({ fill: 'red', stroke: 'blue', 'fill-opacity': 0, 'stroke-width': 0.5 });

            shapePathL = r.path(dataL).toBack();
            shapePathL.attr({ fill: 'blue', stroke: 'black', 'fill-opacity': 0, 'stroke-width': 0.5 });
        }

        canvasWidth = jQuery('.SplineBenchDiv').width();
        canvasHeight = jQuery('.SplineBenchDiv').height();

        var margin = 10.0; // mm

        // scale the shape to fit the canvas
        var scaleX = canvasWidth / (shapeDataLocal.hboxR() + fpd + margin);
        var scaleY = canvasHeight / (shapeDataLocal.vboxR() + margin);
        scaleB = Math.min(scaleX, scaleY);

        // scale negative in Y direction, because we have UP=+ and DOWN=- at the data and other direction at the screen.
        var transformation = ('S1,-1');
        // move to the center of the nose...
        var transX = -fpd / 2.0;
        transformation += ('t' + transX.toFixed(2) + ',0');

        if (sides !== 'L') {
            centerR.transform(transformation);
            shapePathR.transform(transformation);
        }
        if (sides !== 'R') {
            centerL.transform(transformation);
            shapePathL.transform(transformation);
        }

        sizeX = canvasWidth / scaleB;
        sizeY = canvasHeight / scaleB;
        viewbox = [-sizeX / 2, -sizeY / 2, sizeX, sizeY];
        r.setViewBox.apply(r, viewbox);

        self.SetMode(1);
    };

    self.onZoom = function () {

        r.clear();
        canvasWidth = jQuery('.SplineBenchDiv').width();
        canvasHeight = jQuery('.SplineBenchDiv').height();
        r = Raphael(jQuery('.SplineBenchDiv')[0], canvasWidth, canvasHeight);
        

        // scale the shape to fit the canvas
        scaleX = canvasWidth / (60.0 + margin);
        scaleY = canvasHeight / (50.0 + margin);
        scaleB = Math.min(scaleX, scaleY);

        sizeX = canvasWidth / scaleB;
        sizeY = canvasHeight / scaleB;
        viewbox = [-sizeX / 2, -sizeY / 2, sizeX, sizeY];
        r.setViewBox.apply(r, viewbox);

        centerLine = r.path('M-35 0 L35 0 M0 -30 L0 30');
        centerLine.attr({ stroke: 'black', 'stroke-width': 1.0 / scaleB, "stroke-dasharray": '--.' });

        drawRubber();
        setupRubber();

    };

    // 0: pure shape
    // 1: spline
    // 11: dummy spline
    self.SetMode = function (modus) {
        var margin;
        switch (modus) {
            case 0:
                break;
            case 11: // start with dummy spline
                r.clear();


                margin = 10.0; // mm

                // scale the shape to fit the canvas
                scaleX = canvasWidth / (60.0 + margin);
                scaleY = canvasHeight / (50.0 + margin);
                scaleB = Math.min(scaleX, scaleY);
                sizeX = canvasWidth / scaleB;
                sizeY = canvasHeight / scaleB;
                viewbox = [-sizeX / 2, -sizeY / 2, sizeX, sizeY];
                r.setViewBox.apply(r, viewbox);
                centerLine = r.path('M-35 0 L35 0 M0 -30 L0 30');
                centerLine.attr({ stroke: 'black', 'stroke-width': 1.0 / scaleB, "stroke-dasharray": '--.' });

                spline = new Spline();
                spline.addSplinePoint(-25.0, 20.0);
                spline.addSplinePoint(15.0, 20.0);
                spline.addSplinePoint(25.0, -20.0);
                spline.addSplinePoint(-25.0, -20.0);

                spline.CalcCtrlPoints(0);
                spline.CalcCtrlPoints(1);
                spline.CalcCtrlPoints(2);
                spline.CalcCtrlPoints(3);

                splineChanged();
                break;
            case 1: // spline from shape
                spline = new Spline();
                var noOfPoints = shapeDataLocal.radiiR.length;

                // search 4 points in 4 quadrants :
                var p0 = CalcSplinePointFromShape(0);
                var p1 = CalcSplinePointFromShape(1);
                var p2 = CalcSplinePointFromShape(2);
                var p3 = CalcSplinePointFromShape(3);

                var p01 = shapeDataLocal.radiiR[Math.floor((p1.shapeIdx + p0.shapeIdx) / 2)];
                var p12 = shapeDataLocal.radiiR[Math.floor((p2.shapeIdx + p1.shapeIdx) / 2)];
                var p23 = shapeDataLocal.radiiR[Math.floor((p3.shapeIdx + p2.shapeIdx) / 2)];
                var p30 = shapeDataLocal.radiiR[Math.floor(((p0.shapeIdx + noOfPoints + p3.shapeIdx) / 2) % noOfPoints)];

                var r1 = GetRadius3P(p0.P.position().x, p0.P.position().y, p01.x, -p01.y, p1.P.position().x, p1.P.position().y);
                var r2 = GetRadius3P(p1.P.position().x, p1.P.position().y, p12.x, -p12.y, p2.P.position().x, p2.P.position().y);
                var r3 = GetRadius3P(p2.P.position().x, p2.P.position().y, p23.x, -p23.y, p3.P.position().x, p3.P.position().y);
                var r4 = GetRadius3P(p3.P.position().x, p3.P.position().y, p30.x, -p30.y, p0.P.position().x, p0.P.position().y);

                if (r1 < 0.1) r1 = 0.1;
                if (r2 < 0.1) r2 = 0.1;
                if (r3 < 0.1) r3 = 0.1;
                if (r4 < 0.1) r4 = 0.1;

                p0.P.smooth = shapeDataLocal.hboxR() / r1;
                p1.P.smooth = shapeDataLocal.hboxR() / r2;
                p2.P.smooth = shapeDataLocal.hboxR() / r3;
                p3.P.smooth = shapeDataLocal.hboxR() / r4;

                var h1 = GetAltitude(p0.P.position().x, p0.P.position().y, p01.x, -p01.y, p1.P.position().x, p1.P.position().y);
                var h2 = GetAltitude(p1.P.position().x, p1.P.position().y, p12.x, -p12.y, p2.P.position().x, p2.P.position().y);
                var h3 = GetAltitude(p2.P.position().x, p2.P.position().y, p23.x, -p23.y, p3.P.position().x, p3.P.position().y);
                var h4 = GetAltitude(p3.P.position().x, p3.P.position().y, p30.x, -p30.y, p0.P.position().x, p0.P.position().y);

                p0.P.smooth = 8.0 * h1 / shapeDataLocal.hboxR();
                p1.P.smooth = 8.0 * h2 / shapeDataLocal.hboxR();
                p2.P.smooth = 8.0 * h3 / shapeDataLocal.hboxR();
                p3.P.smooth = 8.0 * h4 / shapeDataLocal.hboxR();

                spline.guessAllCtrlPoints();

                splineChanged();
                break;
            case 3: // start with dummy rubber

                //setOffsetsETC();

                if (shapeDataLocal.radiiR.length === 0 || shapeDataLocal.radiiL.length === 0) {



                    //canvasWidth = jQuery('.SplineBenchDiv').width();
                    //canvasHeight = jQuery(".SplineBenchDiv").height();
                    //r = Raphael(jQuery('.SplineBenchDiv')[0], canvasWidth, canvasHeight);
                    //r.width = jQuery('.SplineBenchDiv').width();
                    //r.height = jQuery('.SplineBenchDiv').height();
                    var drawCanvas = jQuery('#splineBenchDiv')[0];
                    //paperOffset = drawCanvas.offset();
                    //paperOffset.top -= 304;
                    //xOffset = paperOffset.left;
                    //yOffset = paperOffset.top;
                    if (drawCanvas.firstElementChild == null)
                        setupCanvas(drawCanvas, canvasWidth, canvasHeight);
                   /* r.canvas.id = "shapeDrawerCanvasSVG";
                    margin = 10.0; // mm

                    // scale the shape to fit the canvas
                    scaleX = canvasWidth / (60.0 + margin);
                    scaleY = canvasHeight / (50.0 + margin);
                    scaleB = Math.min(scaleX, scaleY);
                    sizeX = canvasWidth / scaleB;
                    sizeY = canvasHeight / scaleB;
                    viewbox = [-sizeX / 2, -sizeY / 2, sizeX, sizeY];
                    r.setViewBox.apply(r, viewbox);
                    if ($('#shapeDrawerCanvasSVG')[0].childNodes.length < 5) {
                        centerLine = r.path('M-40 0 L40 0 M0 -30 L0 30');
                        centerLine.attr({ stroke: 'black', 'stroke-width': 1.0 / scaleB, "stroke-dasharray": '--.' });
                    }

                    rubber = new Rubber();
                    //var radii = [2602, 2452, 2281, 2140, 2020, 1930, 1849, 1792, 1753, 1723, 1711, 1716, 1724, 1748, 1789, 1831, 1888, 1961, 2035, 2123, 2229, 2329, 2451, 2568, 2700, 2826, 2961, 3085, 3216, 3305, 3369, 3391, 3409, 3416, 3424, 3421, 3430, 3412, 3416, 3378, 3354, 3301, 3235, 3179, 3083, 2983, 2890, 2794, 2714, 2638, 2574, 2523, 2474, 2441, 2416, 2398, 2397, 2400, 2415, 2448, 2481, 2538, 2596, 2674, 2752, 2848, 2925, 2996, 2996, 2971, 2874, 2765];
                    for (var i = 0; i < 72; i++)
                        rubber.Rub(i).Rad = 0.0;//(0.01 * radii[i]);*/
                }
                drawRubber();
                setupRubber();

                break;
        }
    };
}
