//-------------------------------------------------------------------------------------------------
//  DrillEditor
//
//      draw a shape with drill holes
//      edit drill holes by mouse
//
//-------------------------------------------------------------------------------------------------
//  Author: New OpsysWeb Dev Team
//  Versions:
//      V0.9.1  2015/07/17  First release
//-------------------------------------------------------------------------------------------------

function DrillEditor(shapeData1, shapeCanvasDivId, canvasProportion, drawOneToOne, isStandAloneMode) {

    var self = this;
    var shapeDataLocal;
    var selector = null;
    var selecting = false;
    var xOffset;
    var yOffset;
    var shiftPressed = false;
    var r;
    var holes = [];
    var paperOffset;
    var viewbox = [];
    var mdown;
    var isOneToOne = false;
    var canvasDivId = 'ShapeCanvas';
    var scaleB = 1.0;
    var sideMode = 'B'; // R/L/B

    // 0: pure shape
    // 1: spline
    // 4: drill editor
    var curMode = -1;

    this.DrawShape = function (isOneToOne) {
        DrawShape(isOneToOne);
    }

    function dragger() {
        if (!this.VM.isSelected()) {
            if (!shiftPressed)
                deselectAll();
            this.VM.isSelected(true);
        } else {
            if (shiftPressed)
                this.VM.isSelected(false);
        }
        for (var x in holes) {
            if (holes.hasOwnProperty(x)) {
                if (holes[x].VM.isSelected()) {
                    holes[x].sx_ = holes[x].VM.XStart();
                    holes[x].sy_ = holes[x].VM.YStart();
                    holes[x].ex_ = holes[x].VM.XEnd();
                    holes[x].ey_ = holes[x].VM.YEnd();
                }
            }
        }
    }

    function move(dx, dy) {
        dx /= scaleB;
        dy /= scaleB;
        for (var x in holes) {
            if (holes[x].VM.FaceSide() == 'B' && this.isLeft) dx = -dx;
            if (holes.hasOwnProperty(x)) {
                if (holes[x].VM.isSelected()) {
                    try {
                        if (holes[x].master !== undefined) continue; // don't move mirroed3 holes (Left holes on BOTH side definitions) 
                        holes[x].VM.visuals({
                            X: holes[x].sx_ + dx,
                            Y: (holes[x].sy_ - dy),
                            XE: holes[x].ex_ + dx,
                            YE: (holes[x].ey_ - dy)
                        });

                    } catch (e) {
                    }
                }
            }
        }

    }

    function up() {
        drillholeCollectionChanged();
    }
    function deselectAll() {
        for (var x in holes) {
            if (holes.hasOwnProperty(x)) {
                holes[x].selected_(false);
            }
        }
    }

    function setupSelector() {
        var thecanvas = r.rect(viewbox[0], viewbox[1], viewbox[2], viewbox[3]).attr({ fill: '#FFFFFF', opacity: 0 });
        thecanvas.attr({ cursor: 'crosshair' });
        selector = null;
        var startSelector = function (dx, dy) {

            xOffset = -viewbox[0] + paperOffset.left / scaleB;
            yOffset = -viewbox[1] + paperOffset.top / scaleB;
            var x = (dx / scaleB) - xOffset;
            var y = (dy / scaleB) - yOffset;

            if (selector == null) {
                selector = r.rect(x, y, 0, 0);
                selector.attr({ fill: '#888888', 'fill-opacity': 0.1, stroke: '#AAAAAA', 'stroke-width': 0.4, 'stroke-dasharray': '. -' });
            } else {
                selector.hide();
                selector.attr({ x: x, y: y });
            }
            selecting = true;
        };
        var moveSelector = function (dx, dy) {
            dx /= scaleB;
            dy /= scaleB;
            if (selecting) {
                if (!shiftPressed)
                    deselectAll();

                selector.show();
                // var ox = selector.attr('x');
                // var oy = selector.attr('y');
                var xoffset = 0, yoffset = 0;
                if (dx < 0) {
                    xoffset = dx;
                    dx = -1 * dx;
                }
                if (dy < 0) {
                    yoffset = dy;
                    dy = -1 * dy;
                }
                selector.transform('T' + xoffset + ',' + yoffset);
                selector.attr({ width: dx, height: dy });

                for (var x in holes) {
                    if (holes.hasOwnProperty(x)) {
                        if (Raphael.isBBoxIntersect(holes[x].getBBox(), selector.getBBox()))
                            holes[x].selected_(true);
                        // else if (!shiftPressed) 
                        //    holes[x].selected_(false);
                    }
                }
            }
        };
        var upSelector = function () {
            selecting = false;
            selector.hide();
        };
        thecanvas.drag(moveSelector, startSelector, upSelector);
        thecanvas.mousedown(mdown);
    }

    function ClearShape() {
        for (var x in holes) {
            if (holes.hasOwnProperty(x)) {
                holes[x].isDeleted = true;
                holes[x].remove();
            }
        }
        holes.length = 0;
        r.clear();
    }

    function DrawShape(isOneToOne) {
        ClearShape();
        var margin = 0; // mm
        var dataR = '';
        var dataL = '';
        var fpd = shapeDataLocal.fpd();
        if (sideMode !== 'B')
            fpd = 0;

        // scale the shape to fit the canvas
        var scaleX;
        var scaleY;

        if (!isOneToOne) {
            margin = 15.0;
        }

        scaleY = shapeDataLocal.height / (Math.max(shapeDataLocal.vboxR(), shapeDataLocal.vboxL()) + margin);
        scaleX = shapeDataLocal.width / (Math.max(shapeDataLocal.hboxR(), shapeDataLocal.hboxL()) + fpd + margin);
        scaleB = Math.min(scaleX, scaleY);

        var shapePathR;
        var shapePathL;
        var centerR;
        var centerL;
        var actrad;
        var lineV;
        var lineH;
        if (sideMode !== 'L' && shapeDataLocal.radiiR.length > 0) {
            for (actrad in shapeDataLocal.radiiR) {
                if (shapeDataLocal.radiiR.hasOwnProperty(actrad)) {
                    dataR += ((actrad === '0') ? 'M' : 'L') + (shapeDataLocal.radiiR[actrad].x.toFixed(2) + ' ' + shapeDataLocal.radiiR[actrad].y.toFixed(2) + ' ');

                }
            }
            if (dataR !== '') {
                dataR += ' z';
                shapePathR = r.path(dataR).toBack();
                if (shapePathR)
                    shapePathR.attr({ fill: '#ff1133', stroke: 'blue', 'fill-opacity': 0, 'stroke-width': 1.0 / scaleB, cursor: 'crosshair' });
                if (shapePathR[0])
                    shapePathR[0].id = 'pathR';
            };
            if (!isOneToOne) {
                lineV = shapeDataLocal.vboxR() + margin / 2.0;
                lineH = shapeDataLocal.hboxR() + margin / 2.0;
                centerR = r.path('M' + (-lineH / 2.0) + ' 0 L' + (lineH / 2.0) + ' 0 M0 ' + (-lineV / 2.0) + ' L0 ' + (lineV / 2.0));
                centerR.attr({ fill: '#ff1133', stroke: 'black', 'fill-opacity': 0, 'stroke-width': 1.0 / scaleB, 'stroke-dasharray': '--.' });
            };
        }

        if (sideMode !== 'R' && shapeDataLocal.radiiL.length > 0) {
            for (actrad in shapeDataLocal.radiiL) {
                if (shapeDataLocal.radiiL.hasOwnProperty(actrad)) {
                    dataL += ((actrad === '0') ? 'M' : 'L') + ((shapeDataLocal.radiiL[actrad].x + fpd).toFixed(2) + ' ' + shapeDataLocal.radiiL[actrad].y.toFixed(2) + ' ');
                }
            }
            if (dataL !== '') {
                dataL += ' z';
                shapePathL = r.path(dataL).toBack();
                shapePathL.attr({ fill: 'blue', stroke: 'blue', 'fill-opacity': 0, 'stroke-width': 1.0 / scaleB });
                if (shapePathL[0])
                    shapePathL[0].id = 'pathL';
            };
            if (!isOneToOne) {
                lineV = shapeDataLocal.vboxL() + margin / 2.0;
                lineH = shapeDataLocal.hboxL() + margin / 2.0;
                centerL = r.path('M' + (fpd - (lineH / 2.0)).toFixed(2) + ' 0 L' + (fpd + (lineH / 2.0)).toFixed(2) + ' 0 M' + fpd.toFixed(2) + ' ' + (-lineV / 2.0) + ' L' + fpd.toFixed(2) + ' ' + (lineV / 2.0));
                centerL.attr({ fill: '#ff1133', stroke: 'black', 'fill-opacity': 0, 'stroke-width': 1.0 / scaleB, cursor: 'crosshair', 'stroke-dasharray': '--.' });
            };
        };

        // scale negative in Y direction, because we have UP=+ and DOWN=- at the data and other direction at the screen.
        var transformation = ('S1,-1t');
        // move to the center of the nose...
        var transX = (-fpd / 2.0).toFixed(2);
        transformation += (transX + ',0');

        if (sideMode !== 'L') {
            if (!isOneToOne && centerR)
                centerR.transform(transformation);
            if (shapePathR) {
                var yRightValues = _.map(shapeDataLocal.radiiR, function (r) { return r.y; });
                var yMin = _.min(yRightValues);
                var shapeRightTransform = "S1,-1t" + transX + ',' + (yMin + (_.max(yRightValues) - yMin) / 2).toFixed(2)
                shapePathR.transform(shapeRightTransform);
            }
        }
        if (sideMode !== 'R') {
            if (!isOneToOne && centerL)
                centerL.transform(transformation);
            if (shapePathL) {
                var yLeftValues = _.map(shapeDataLocal.radiiL, function (r) { return r.y; });
                var yMin = _.min(yLeftValues);
                var shapeLeftTransform = "S1,-1t" + transX + ',' + (yMin + (_.max(yLeftValues) - yMin) / 2).toFixed(2)
                shapePathL.transform(shapeLeftTransform);
            }
        }

        var sizeX = shapeDataLocal.width / scaleB;
        var sizeY = shapeDataLocal.height / scaleB;
        if (!isNaN(sizeX) && !isNaN(sizeY)) {
            if (isOneToOne)
                viewbox = [-sizeX / 2, -sizeY / 2, sizeX, sizeY];
            else
                viewbox = [-sizeX / 2, -sizeY / 2.3, sizeX, sizeY / 1.1];

            r.setViewBox.apply(r, viewbox);
            drillholeCollectionChanged();
        }
    }

    function isCanvasReady() {
        return (jQuery('#' + canvasDivId).width() > 0 && jQuery('#' + canvasDivId).height() > 0);
    }

    function getEstimatedCanvasWidth(isStandAloneMode) {
        if (isStandAloneMode) {

            return (jQuery('#' + 'divShapes')[0].offsetWidth / (canvasProportion / 100));
        } else {

            return (jQuery('#' + 'divShapeManagerContainer')[0].offsetWidth / (canvasProportion / 100));
        }
    }

    self.SetMode = function (modus, side) {
        sideMode = side;
        // if (modus === 1) {
        //    if (jQuery('#' + canvasDivId).width() === 0)
        //        canvasDivId = jQuery('#' + drawBenchDiv.id).width() === 0 ? splineBenchDiv.id : drawBenchDiv.id;
        // }
        if (!isOneToOne) {
            shapeDataLocal.width = isCanvasReady() ? jQuery('#' + canvasDivId).width() : getEstimatedCanvasWidth(isStandAloneMode);
            shapeDataLocal.height = 418;
            if (jQuery('#' + canvasDivId).height() < 300) jQuery('#' + canvasDivId).height(shapeDataLocal.height);
        }

        DrawShape(isOneToOne);

        if (modus === -1) // no mode change...
            modus = curMode;
        switch (modus) {
            case 0:
            case 1:
                drillholeCollectionChanged();
                r.rect(viewbox[0], viewbox[1], viewbox[2], viewbox[3]).attr({ fill: '#FFFFFF', opacity: 0 }).toFront();
                curMode = 0;
                break;
            case 4:
                setupSelector();
                drillholeCollectionChanged();
                curMode = 4;
                break;
        }

    };

    function addHole(newHole) {
        var hole = newHole;
        holes.push(hole);
        hole.mousedown(mdown);
        hole.drag(move, dragger, up);
        hole.idx_ = holes.length;
        hole.selected_ = function (isSelected) {
            this.VM.isSelected(isSelected);
        };
        hole.removeMe = function () {
            var index = holes.indexOf(this);
            if (index >= 0)
                holes.splice(index, 1);
            this.remove();
        };
    }

    // constructor
    try {
        shapeDataLocal = shapeData1;
        isOneToOne = drawOneToOne ? drawOneToOne : false;
        canvasDivId = shapeCanvasDivId;
        selector = null;
        selecting = false;
        shiftPressed = false;
        holes = [];
        viewbox = [0, 0, shapeDataLocal.width, shapeDataLocal.height];
        mdown = function (e) {
            var evt = e ? e : window.event;
            shiftPressed = evt.shiftKey;
        };
        $('#' + canvasDivId).html('');
        var drawCanvas = jQuery('#' + canvasDivId);
        paperOffset = drawCanvas.offset();
        paperOffset.top -= 304;
        xOffset = paperOffset.left;
        yOffset = paperOffset.top;
        r = Raphael(jQuery('#' + canvasDivId)[0], shapeDataLocal.width, shapeDataLocal.height);
        setupSelector();
        shapeDataLocal.Drillholes.subscribe(function () {
            drillholeCollectionChanged();
        });
    } catch (e) {
        console.log(e.toString());
    };

    function drillholeCollectionChanged() {
        //// First remove all visuals in case a drillhole was deleted:
        for (var x in holes) {
            if (holes.hasOwnProperty(x)) {
                holes[x].isDeleted = true;
                holes[x].remove();
            }
        }
        holes.length = 0;
        for (var i = 0; i < shapeData1.Drillholes().length; i++) {
            var dh = shapeData1.Drillholes()[i];
            drawFeature(dh);
            if (dh.sub !== undefined)
                dh.sub.dispose(); // cancel existing subscription
            dh.sub = dh.visuals.subscribe(function (dh) {
                drawFeature(dh);
            });
            dh.FaceSide.subscribe(function () {
                drillholeCollectionChanged();
            });
            shapeData1.toggleAcceptButton(shapeData1.areAllDrillsInsideShape(shapeData1.Drillholes()));
        }
    }

    function drawFeature(dh) {
        var tmp;
        var tmp2;
        // First draw horizontal rectangle with rounded corners starting from XStart/YStart to direction "+"
        var startX = dh.XStart();
        var startY = -dh.YStart();
        var endX = dh.XEnd();
        var endY = -dh.YEnd();
        var side = dh.FaceSide();
        var fpd = shapeDataLocal.fpd();
        var holeColor = 'black';
        var fillColor = '';
        if (shapeDataLocal.activeSide === 'L') {
            holeColor = '#E8E5E4';
        }
        var width = Math.sqrt((endX - startX) * (endX - startX) + (endY - startY) * (endY - startY));
        width += dh.Diameter();
        var height = dh.Diameter();
        if ((dh.visual === undefined) || (dh.visual.paper === undefined) || (dh.visual.paper === null)) {
            // new visual
            tmp = r.rect(startX, startY, width, height, height / 2.0);
            tmp.attr({ fill: '#ff1133', stroke: holeColor, 'fill-opacity': 0, 'stroke-width': 0.4, cursor: 'move' });
            tmp.VM = dh;
            if (sideMode === 'B' || sideMode === 'R')
                tmp[0].id = 'holeR';
            else
                tmp[0].id = 'holeL';
            dh.visual = tmp;
            addHole(tmp);
        } else {
            // existing feature
            tmp = dh.visual;
            tmp.attr({ "x": startX, "y": startY, "width": width, "height": height, "r": height / 2.0 });
        }
        fillColor = dh.isSelected() ? '#00FF00' : '#FFFFFF';
        tmp.attr({ fill: fillColor, 'fill-opacity': 0.7 });
        // Now transform it to:
        // a) StartX/StartY moved to center of Start-Hole
        var trafo = ('T' + (-height / 2.0) + ',' + (-height / 2.0));
        // for left side holes - flip it around y-axis:
        var trafo2 = trafo + 'S-1,1,0,0';
        // b) Rotate around hole to end at EndX/EndY
        var degree = Math.atan2(endY - startY, endX - startX);
        degree = degree * 180.0 / Math.PI;
        trafo += ('R' + degree + ',' + startX + ',' + startY);
        trafo2 += ('R' + degree + ',' + (-startX) + ',' + startY);

        var shiftR = 0;
        var shiftL = 0;

        switch (sideMode) {
            case 'B':
                shiftR = (-fpd / 2.0);
                shiftL = (fpd / 2.0);
                break;
            case 'R':
                if (side !== 'R')
                    shiftL = 200.0;//fpd;
                break;
            case 'L':
                if (side !== 'L')
                    shiftR = -200.0;//-fpd;
                break;
        }

        tmp.isLeft = false;
        if (shapeDataLocal.activeSide === 'R') {
            holeColor = '#E8E5E4';
        } else {
            holeColor = 'black';
        }
        if (side === 'L') {
            // take left side values...
            if (dh.XOrigin() !== 'C')
                trafo = trafo2;
            shiftR = shiftL;
            tmp.isLeft = true;
        } else if (side === 'B') {

            // draw a second feature for the left side....
            if ((dh.visual2 === undefined) || (dh.visual2.paper === undefined) || (dh.visual2.paper === null)) {
                // new visual for left side
                tmp2 = r.rect(startX, startY, width, height, height / 2.0);
                tmp2.attr({ fill: '#ff1133', stroke: holeColor, 'fill-opacity': 0, 'stroke-width': 0.4, cursor: 'move' });
                tmp2.VM = dh;
                if (sideMode === 'L')
                    tmp2[0].id = 'holeR';
                else
                    tmp2[0].id = 'holeL';
                tmp2.master = tmp;
                dh.visual2 = tmp2;
                addHole(tmp2);
            } else {
                // existing feature
                tmp2 = dh.visual2;
                tmp2.attr({ "x": startX, "y": startY, "width": width, "height": height, "r": height / 2.0 });
            }
            fillColor = dh.isSelected() ? '#00FF00' : '#FFFFFF';
            tmp2.attr({ fill: fillColor, 'fill-opacity': 0.7 });
            // shift it ...
            tmp2.transform(trafo2 + 'T' + (shiftL) + ',0' + '');
            tmp2.isLeft = true;
        }
        // shift it ...
        trafo += 'T' + shiftR + ',0';
        tmp.transform(trafo);
    }
}
