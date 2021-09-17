//-------------------------------------------------------------------------------------------------
//  DrawingEngine
//
//      Draw a freehand shape using html5 canvas
//      
//
//-------------------------------------------------------------------------------------------------
//  Author: New OpsysWeb Dev Team
//  Versions:
//      V1.0  2018/05/04  First release
//-------------------------------------------------------------------------------------------------

// Variables
{
    var canvas = null;
    var context = null;
    var canvasWidth = 788;
    var canvasHeight = 418;
    var firstQuadrantArray = [];
    var secondQuadrantArray = [];
    var thirdQuadrantArray = [];
    var fourthQuadrantArray = [];
    var bool_IsDrawing = false;
    var twoDimensionalArrayPoints = [];
    var point2DCurrentPoint = [];
    var bool_CanClose = false;
    var bool_Isclose = false;
    var pahtReturned = false;
    var Engine;
    var requestId;
    var pathArrayPoints = [];
    var Paused = true;
    var path = undefined;

}

function ShapeDrawer() {
    var self = this;

    self.enableSaveChanges = function (enable) {
        if (enable) {
            if ($('#saveButton').attr('disabled')) {
                $('#saveButton').removeAttr('disabled');
            }
        } else {
            $('#saveButton').attr({
                'disabled': 'disabled'
            });
        }
    };

    self.enableClear = function (enable) {
        if (enable) {
            if ($('#clearButton').attr('disabled')) {
                $('#clearButton').removeAttr('disabled');
            }
        } else {
            $('#clearButton').attr({
                'disabled': 'disabled'
            });
        }
    };

    self.Init = function () {
        Restart();
    };

    self.InitCanvas = function () {
        Restart();
        Engine.start();
    };

    function ShapeManagerDrawingEngine(canvas, context) {
        this.canvas = canvas;
        this.context = context;
        this.inputManager = new InputManager(this);
        this.inputManager.init();
        this.clearColor = "#A0A0A0";
        this.lines = [];
        this.hitpoints = [];
    };

    ShapeManagerDrawingEngine.prototype.start = function () {
        if (!bool_Isclose && Paused == false) {
            this.update();
            this.render();
            requestId = window.requestAnimationFrame(this.start.bind(this));
        }
        else {
            this.unbind();
        }
    };

    ShapeManagerDrawingEngine.prototype.unbind = function () {
        this.update();
        this.render();
        window.cancelAnimationFrame(requestId);
        requestId = undefined;
    };

    ShapeManagerDrawingEngine.prototype.clear = function () {
        this.context.save();
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = this.clearColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.restore();
    };

    ShapeManagerDrawingEngine.prototype.update = function () {
        var mouseX = this.inputManager.mouseX;
        var mouseY = this.inputManager.mouseY;

        this.hitpoints = [];
        if (twoDimensionalArrayPoints.length >= 0) {
            for (var i = 0; i < 1; i++) {
                var line = this.lines[i];
                var closestPoint = null;
                closestPoint = new Point(788 / 2, 418 / 2);
                var ray = new Line(new Point(mouseX, mouseY), new Point(closestPoint.x, closestPoint.y));
                var minDistance = ray.length();
                var p1 = twoDimensionalArrayPoints[0];
                var p2 = twoDimensionalArrayPoints[1];
                for (var i = 1, len = twoDimensionalArrayPoints.length; i < len; i++) {
                    var checkline = new Line(new Point(p1.x, p1.y), new Point(p2.x, p2.y));
                    if (line != checkline) {
                        if (checkline.intersectsWith(ray)) {
                            var intersectionPoint = checkline.intersectionPoint(ray);
                            var tempRay = new Line(new Point(mouseX, mouseY), new Point(intersectionPoint.x, intersectionPoint.y));
                            if (tempRay.length() < minDistance) {
                                closestPoint = intersectionPoint;
                                minDistance = tempRay.length();
                            }
                            {
                                twoDimensionalArrayPoints[i].x = mouseX;
                                twoDimensionalArrayPoints[i].y = mouseY;
                                if (twoDimensionalArrayPoints[i + 1] != undefined) {
                                    twoDimensionalArrayPoints[i + 1].x = mouseX;
                                    twoDimensionalArrayPoints[i + 1].y = mouseY;
                                }
                            }

                        }
                    }
                    p1 = twoDimensionalArrayPoints[i];
                    p2 = twoDimensionalArrayPoints[i + 1];
                }
                this.hitpoints.push(closestPoint);
            }
        }
    };

    ShapeManagerDrawingEngine.prototype.render = function () {
        var axisMargin = 30;
        if (bool_Isclose == false) {
            this.clear();
            this.context.save();
            this.context.beginPath();
            this.context.fillStyle = "#ccffff";
            this.context.fill();
            this.context.stroke();
            context.setLineDash([5, 5]);
            // Draw  X Axis
            context.moveTo(0 + axisMargin, canvas.height / 2);
            context.lineTo(canvas.width - axisMargin, canvas.height / 2);
            // Draw  Y Axis
            context.moveTo(canvas.width / 2, canvas.height - axisMargin);
            context.lineTo(canvas.width / 2, 0 + axisMargin);
            context.stroke();
            context.setLineDash([0, 0]);
            context.lineWidth = 0.5;
            this.context.strokeStyle = "#000000";
            var p1 = twoDimensionalArrayPoints[0];
            var p2 = twoDimensionalArrayPoints[1];
            context.beginPath();
            for (var i = 1, len = twoDimensionalArrayPoints.length; i < len; i++) {
                var midPoint = midPointBtw(p1, p2);
                context.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
                p1 = twoDimensionalArrayPoints[i];
                p2 = twoDimensionalArrayPoints[i + 1];
            }
            context.fillStyle = "#f2f2f2";
            context.fill();
            this.context.stroke();
            this.context.restore();
        }
        else { closeShape(); }
    };

    InputManager.prototype.init = function () {
        this.Engine.canvas.addEventListener("mousemove", this.onMouseMove.bind(this), false);
        this.Engine.canvas.addEventListener("mousedown", this.onMouseDown.bind(this), false);
        this.Engine.canvas.addEventListener("mouseup", this.onMouseUp.bind(this), false);
    };

    InputManager.prototype.onMouseMove = function (e) {
        if (bool_IsDrawing) {
            var rect = this.Engine.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            var centeredx = this.mouseX - (rect.width / 2);
            var centeredy = this.mouseY - (rect.height / 2);
            if ((this.mouseX > 10 && this.mouseX < 780) && (this.mouseY > 10 && this.mouseY < 410)) {
                twoDimensionalArrayPoints.push({ x: this.mouseX, y: this.mouseY });
                pathArrayPoints.push({ x: centeredx, y: centeredy });
            }
            var p1 = twoDimensionalArrayPoints[0];
            var p3 = twoDimensionalArrayPoints[twoDimensionalArrayPoints.length - 1];
            var CurrentDistance = Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2));
            fillArrays();
            if (firstQuadrantArray.length >= 10 == true && secondQuadrantArray.length >= 10 == true && thirdQuadrantArray.length >= 10 == true && fourthQuadrantArray.length >= 10 == true) {
                if (CurrentDistance < 15) { bool_Isclose = true; }
            }
            else { bool_CanClose = false; }
            Draw();
        }
    };

    InputManager.prototype.onMouseDown = function (e) {

        if (twoDimensionalArrayPoints > 0) { self.enableClear(true); }
        else { self.enableClear(true); };

        if (Paused) { Paused = false; Engine.start(); }
        if (bool_Isclose) { return; }
        this.hoverOver = true;
        var rect = this.Engine.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
        var estado = 0;
        point2DCurrentPoint = ({ x: this.mouseX, y: this.mouseY });
        if (twoDimensionalArrayPoints.length > 0) {
            var p1 = twoDimensionalArrayPoints[0];
            var p2 = point2DCurrentPoint;
            var p3 = twoDimensionalArrayPoints[twoDimensionalArrayPoints.length - 1];
            var p4 = point2DCurrentPoint;
            var distanciaOrigenFin = Math.sqrt(Math.pow(p4.x - p3.x, 2) + Math.pow(p4.y - p3.y, 2));
            var distanciaOrigenOrigen = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            if (distanciaOrigenFin > distanciaOrigenOrigen && twoDimensionalArrayPoints.length > 20) {
                var copy = twoDimensionalArrayPoints;
                var copy2 = pathArrayPoints;
                twoDimensionalArrayPoints = [];
                for (var i = copy.length - 1; i >= 0 ; i--) {
                    twoDimensionalArrayPoints.push(copy[i]);
                    estado = 0;
                }
                pathArrayPoints = [];
                for (var i = copy2.length - 1; i >= 0 ; i--) {
                    pathArrayPoints.push(copy2[i]);
                }
            }
            else { estado = 1; }
        }
        Draw();
        bool_IsDrawing = true;
    };

    InputManager.prototype.onMouseUp = function (e) {
        if (bool_Isclose) { return; }
        var rect = this.Engine.canvas.getBoundingClientRect();
        bool_IsDrawing = false;
        if ((this.mouseX > 10 && this.mouseX < 780) && (this.mouseY > 10 && this.mouseY < 410)) {
            twoDimensionalArrayPoints.push({ x: this.mouseX, y: this.mouseY });
            var centeredx = this.mouseX - (rect.width / 2);
            var centeredy = this.mouseY - (rect.height / 2);
            pathArrayPoints.push({ x: centeredx, y: centeredy });
        }
        this.hoverOver = false;
        path = getPath(pathArrayPoints);
        Paused = true;

    }

    function getPath(points) {
        var localPath = '';
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            if (i === 0) {
                localPath += 'M' + p.x + ' ' + (p.y);
            } else {
                localPath += 'L' + p.x + ' ' + (p.y);
            }
        }
        localPath += 'z';
        return localPath;
    };

    function Restart() {
        var path = undefined;

        pathArrayPoints = [];
        pahtReturned = false;
        canvas = null;
        context = null;
        canvasWidth = 788;
        canvasHeight = 418;
        firstQuadrantArray = [];
        secondQuadrantArray = [];
        thirdQuadrantArray = [];
        fourthQuadrantArray = [];
        bool_IsDrawing = false;
        twoDimensionalArrayPoints = [];
        point2DCurrentPoint = [];
        bool_CanClose = false;
        bool_Isclose = false;
        canvas = document.getElementById("displayCanvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        context = canvas.getContext("2d");
        context.globalAlpha = 0.6;
        Engine = new ShapeManagerDrawingEngine(canvas, context);
        self.enableSaveChanges(bool_Isclose);
        self.enableClear(false);
        Engine.start();
    };

    self.GetOMA = function (noOfPoints) {

        var oma = 'TRCFMT=1;' + noOfPoints + ';U;R;P\n';
        var rads = 'R=';
        var angs = 'A=';
        var offsets = getCenterOffsets(twoDimensionalArrayPoints); 0
        path = getCenteredPath(pathArrayPoints, offsets.x, offsets.y);

        var pathSrc = path;
        var bbox = Raphael.pathBBox(pathSrc);
        var hbox = 'HBOX=' + bbox.width + ';' + bbox.width;
        var vbox = 'VBOX=' + bbox.height + ';' + bbox.height;
        var rayLen = Math.max(bbox.width, bbox.height);
        var centerX = (bbox.x + (bbox.width / 2));
        var centerY = (bbox.y + (bbox.height / 2));


        var phiStep = (Math.PI * 2.0) / noOfPoints;

        for (var i = 0; i < noOfPoints; i++) {
            var ray = 'M' + centerX + ' ' + centerY;
            var lX = rayLen * Math.cos(phiStep * i);
            var lY = rayLen * Math.sin(phiStep * i);
            ray += 'l' + lX + ' ' + lY;

            var inter = Raphael.pathIntersection(pathSrc, ray);

            var r = Math.sqrt(inter[0].x * inter[0].x + inter[0].y * inter[0].y);
            var p = Math.atan2(inter[0].y, inter[0].x);
            if (p < 0) p += 2 * Math.PI;
            p = p * 180.0 / Math.PI;
            rads += (r * 100.0).toFixed(0);
            angs += (p * 100.0).toFixed(0);
            if (i < noOfPoints - 1) {
                rads += ';';
                angs += ';';
            }
        }
        oma += hbox + '\n';
        oma += vbox + '\n';
        oma += rads + '\n';
        oma += angs + '\n';

        return oma;
    };

    function getCenteredPath(points, offsetX, offsetY) {

        var localPath = '';
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            if (i === 0) {
                localPath += 'M' + ((p.x) - offsetX) + ' ' + ((p.y - offsetY) * -1);
            } else {
                localPath += 'L' + ((p.x) - offsetX) + ' ' + ((p.y - offsetY) * -1);
            }
        }
        localPath += 'z';

        return localPath;
    };

    function getCenterOffsets(pointsAbsolute) {

        var bbox = getPathMeasures(pointsAbsolute);
        var absoluteCenterX = 394; //  TODO: Get real size of the canvas to calculate the center x
        var absoluteCenterY = 209; //  TODO: Get real size of the canvas to calculate the center y
        var pathAbsoluteCenterX = (bbox.x1 + bbox.x2) / 2;
        var pathAbsoluteCenterY = (bbox.y1 + bbox.y2) / 2;
        var offsetX = pathAbsoluteCenterX - absoluteCenterX;
        var offsetY = pathAbsoluteCenterY - absoluteCenterY;
        return { x: offsetX, y: offsetY }
    };

    function getPathMeasures(points) {
        var maxX, minX, maxY, minY;
        for (var i = 0; i < points.length; i++) {
            if (i === 0) {
                maxX = minX = points[i].x;
                maxY = minY = points[i].y;
            } else {
                if (points[i].x >= maxX) {
                    maxX = points[i].x;
                }
                if (points[i].x < minX) {
                    minX = points[i].x;
                }
                if (points[i].y >= maxY) {
                    maxY = points[i].y;
                }
                if (points[i].y < minY) {
                    minY = points[i].y;
                }
            }
        }
        var width = Math.abs(maxX - minX);
        var height = Math.abs(maxY - minY);

        return { w: width, h: height, x1: minX, x2: maxX, y1: minY, y2: maxY }
    };

    //  Mid point between 2 2D Points
    function midPointBtw(p1, p2) {
        return {
            x: p1.x + (p2.x - p1.x) / 2,
            y: p1.y + (p2.y - p1.y) / 2
        };
    };

    function closeShape() {
        context.closePath();
        context.lineWidth = 1;
        this.context.strokeStyle = "#000000";
        context.fillStyle = "#f2f2f2";
        context.fill();
        context.stroke();
        bool_IsDrawing = false;
        self.enableSaveChanges(bool_Isclose);
        path = getPath(pathArrayPoints);
    };

    function fillArrays() {
        if (firstQuadrantArray.length > 0) firstQuadrantArray.length = 0;
        if (secondQuadrantArray.length > 0) secondQuadrantArray.length = 0;
        if (thirdQuadrantArray.length > 0) thirdQuadrantArray.length = 0;
        if (fourthQuadrantArray.length > 0) fourthQuadrantArray.length = 0;

        for (var i = 0 ; i < twoDimensionalArrayPoints.length ; i++) {
            // primero
            if ((twoDimensionalArrayPoints[i].x <= 788 / 2) && (twoDimensionalArrayPoints[i].y <= 418 / 2)) {
                firstQuadrantArray.push(({ x: twoDimensionalArrayPoints[i].x, y: twoDimensionalArrayPoints[i].y }));
            }
            // segundo
            if ((twoDimensionalArrayPoints[i].x <= 788 / 2) && (twoDimensionalArrayPoints[i].y >= 418 / 2)) {
                secondQuadrantArray.push(({ x: twoDimensionalArrayPoints[i].x, y: twoDimensionalArrayPoints[i].y }));
            }
            // tercero
            if ((twoDimensionalArrayPoints[i].x >= 788 / 2) && (twoDimensionalArrayPoints[i].y >= 418 / 2)) {
                thirdQuadrantArray.push(({ x: twoDimensionalArrayPoints[i].x, y: twoDimensionalArrayPoints[i].y }));
            }
            // cuarto
            if ((twoDimensionalArrayPoints[i].x >= 788 / 2) && (twoDimensionalArrayPoints[i].y <= 418 / 2)) {
                fourthQuadrantArray.push(({ x: twoDimensionalArrayPoints[i].x, y: twoDimensionalArrayPoints[i].y }));
            }
        }
    };

    function Line(p1, p2) {
        this.p1 = p1;
        this.p2 = p2;
        this.p1.parent = this;
        this.p2.parent = this;
        this.points = [p1, p2];

        this.length = function () {
            return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        }
        this.direction = function () {
            var vLength = this.length();
            return new Point((p2.x - p1.x) / vLength, (p2.y - p1.y) / vLength);
        }

        this.intersectsWith = function (line) {
            var a = this.p1;
            var b = this.p2;
            var c = line.p1;
            var d = line.p2;
            var cmp = new Point(c.x - a.x, c.y - a.y);
            var r = new Point(b.x - a.x, b.y - a.y);
            var s = new Point(d.x - c.x, d.y - c.y);

            var cmpxr = cmp.x * r.y - cmp.y * r.x;
            var cmpxs = cmp.x * s.y - cmp.y * s.x;
            var rxs = r.x * s.y - r.y * s.x;
            if (cmpxr == 0)
                return ((c.x - a.x < 0) != (c.x - b.x < 0)) || ((c.y - a.y < 0) != (c.y - b.y < 0));
            if (rxs == 0)
                return false;
            var rxsr = 1 / rxs;
            var t = cmpxs * rxsr;
            var u = cmpxr * rxsr;
            return (t >= 0) && (t <= 1) && (u >= 0) && (u <= 1);
        }

        this.intersectionPoint = function (line) {
            var a = this.p1;
            var b = this.p2;
            var c = line.p1;
            var d = line.p2;
            var divider = ((a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x));
            if (divider == 0)
                return new Point(0, 0);
            var intersectionX = ((a.x * b.y - a.y * b.x) * (c.x - d.x) - (a.x - b.x) * (c.x * d.y - c.y * d.x)) / divider;
            var intersectionY = ((a.x * b.y - a.y * b.x) * (c.y - d.y) - (a.y - b.y) * (c.x * d.y - c.y * d.x)) / divider;
            return new Point(intersectionX, intersectionY);
        }
    };

    function Point(x, y) {
        this.x = x;
        this.y = y;
        this.parent = null;
    };

    function InputManager(Engine) {
        this.Engine = Engine;
        this.hoverOver = false;
        this.mouseX = 0;
        this.mouseY = 0;
    };

    function Draw() {
        context.lineWidth = 0.5;
        context.fillStyle = "#ff3300";
        var p1 = twoDimensionalArrayPoints[0];
        var p2 = twoDimensionalArrayPoints[1];
        context.beginPath();
        for (var i = 1, len = twoDimensionalArrayPoints.length; i < len; i++) {
            var midPoint = midPointBtw(p1, p2);
            context.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
            p1 = twoDimensionalArrayPoints[i];
            p2 = twoDimensionalArrayPoints[i + 1];
        }
    };

    function midPointBtw(p1, p2) {
        return {
            x: p1.x + (p2.x - p1.x) / 2,
            y: p1.y + (p2.y - p1.y) / 2
        };
    };
}