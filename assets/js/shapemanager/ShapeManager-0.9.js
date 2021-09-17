//-------------------------------------------------------------------------------------------------
//  ShapeManager
//
//      handling shape data and all manipulation of shape data
//      parsing and generating OMA strings
//
//-------------------------------------------------------------------------------------------------
//  Author: NOW Team Development
//  Versions:
//
//      V1.1    2016/07/19  Shape Management for NOW
//-------------------------------------------------------------------------------------------------

ko.observable.fn.withFormat = function (precision) {
    var observable = this;
    observable.formatted = ko.computed({
        read: function () {
            return (isNaN(+observable()) ? 0 : +observable()).toFixed(precision);
        },
        write: function (value) {
            value = parseFloat(value.replace(',', '.').replace(/[^\.\d]/g, '')); // remove everything which is not a dot or a diggit
            observable(isNaN(value) ? null : value); // Write to underlying storage
        }
    });

    return observable;
};

ko.extenders.numeric = function (target, precision) {
    //create a writable computed observable to intercept writes to our observable
    var result = ko.pureComputed({
        read: target,  //always return the original observables value
        write: function (newValue) {
            if (typeof newValue === 'string')
                newValue = newValue.replace(',', '.');

            var current = target(),
                roundingMultiplier = Math.pow(10, precision),
                newValueAsNum = isNaN(newValue) ? 0 : parseFloat(+newValue),
                valueToWrite = Math.round(newValueAsNum * roundingMultiplier) / roundingMultiplier;

            //only write if it changed
            if (valueToWrite !== current) {
                target(valueToWrite);
            } else {
                //if the rounded value is the same, but a different value was written, force a notification for the current field
                if (newValue !== current) {
                    target.notifySubscribers(valueToWrite);
                }
            }
        }
    }).extend({ notify: 'always' });

    //initialize with current value to make sure it is rounded appropriately
    result(target());

    //return the new computed observable
    return result;
};

shapeSources = {
    EMPTY: '',
    STDSHAPE: 'STS',
    FILE: 'UPTRC',
    ETABLET: 'TABLET',
    FRAME: 'FL',
    SPLINE: 'TABLET',
    TRACER: 'TRC',
    IMPRSHAPE: 'IMPRSHAPE',
    IMPTRACE: 'IMPRTRACE'
};

var ShapeData = function () {

    var self = this;
    var omaLoaded = '';
    self.fileApiOK = ko.observable(false);
    // Check for the various File API support.
    if (window.File && window.FileReader) {
        // Great success! The used File APIs are supported.
        self.fileApiOK(true);
    }

    // session data
    self.demoMode = false;
    self.UserID = '';
    self.Password = '';
    self.PubURL = '';
    self.ActToken = ''; // Shamir IL
    self.SessionID = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    self.ShapeDataFromSide = '';
    // Status objects for the UI:
    self.editMode = ko.observable(0); // 1:spline, 2:rubber, 3:std, 4:drill, 5:resize
    self.isCalibrated = ko.observable(false);
    self.isRough = ko.observable(false);
    self.isModified = ko.observable(false);
    self.hasData = ko.observable(false);
    self.multiMode = ko.observable(false);
    self.frameType = ko.observable(0);
    self.tracerID = ko.observable(0);
    self.valid4Drill = ko.pureComputed(function () {
        return ((self.frameType() === '3') && self.hasData());
    }, self);
    self.bevelMode = ko.observable(0); // 0=auto 1=5050 2=1:2 3:front
    self.polish = ko.observable(false);
    self.viewSide = 'B';
    self.sides = ko.observable(-1); // -1=undef 0=R 1=L 2=B
    self.JobReference = ko.observable('');
    self.traceType = ko.observable('P');
    self.dbl = ko.observable(0.0).withFormat(2);
    self.hboxR = ko.observable(0.0).withFormat(2);
    self.vboxR = ko.observable(0.0).withFormat(2);
    self.hboxL = ko.observable(0.0).withFormat(2);
    self.vboxL = ko.observable(0.0).withFormat(2);
    self.fpd = ko.observable(0.0).withFormat(2);
    self.fcrvR = ko.observable(0.0).withFormat(1);
    self.fcrvL = ko.observable(0.0).withFormat(1);
    self.ztiltR = ko.observable(0.0).withFormat(1);
    self.ztiltL = ko.observable(0.0).withFormat(1);
    self.circR = ko.observable(0.0).withFormat(2);
    self.circL = ko.observable(0.0).withFormat(2);
    self.radiiR = [];
    self.radiiL = [];
    self.radiizR = [];
    self.radiizL = [];
    self.svgScale = ko.observable(25.0);
    self.Drillholes = ko.observableArray();
    self.dbl2 = ko.observable(15.0).extend({ numeric: 2 });  // copy of org value for resizing...
    self.hbox2 = ko.observable(50.0).extend({ numeric: 2 }); // copy of org value for resizing...
    self.vbox2 = ko.observable(30.0).extend({ numeric: 2 }); // copy of org value for resizing...

    self.pdR = ko.observable(0.0).withFormat(2);
    self.pdL = ko.observable(0.0).withFormat(2);
    self.ochtR = ko.observable(0.0).withFormat(2);
    self.ochtL = ko.observable(0.0).withFormat(2);
    self.model = '';
    self.modelName = '';
    self.vendor = '';
    self.angMode = '';
    self.zAngMode = '';
    self.fClass = '';
    self.activeSide = 'B';
    self.shapeOrigin = shapeSources.EMPTY;
    self.originalShape = '';
    self.originalDBL = '';
    self.originalHBoxR = '';
    self.originalHBoxL = '';
    self.originalVBoxR = '';
    self.originalVBoxL = '';
    self.originalDBoxL = '';
    self.originalDrillHoles = [];
    self.width = '100%';
    self.height = '100%';

    self.getPath = function (side) {
        var pathSide = side === 'L' ? 'pathL' : 'pathR';
        if ((document.getElementById('ShapeCanvas').childNodes[0].getElementById(pathSide)) != null && angular.isDefined(document.getElementById('ShapeCanvas').childNodes[0].getElementById(pathSide))) {
            return document.getElementById('ShapeCanvas').childNodes[0].getElementById(pathSide).getAttribute("d");
        }
    };
    self.toggleAcceptButton = function (enable) {
        var cursorProperty = enable ? 'pointer' : 'not-allowed';
        $('#BTN_OK4').prop('disabled', !enable);
        $('#BTN_OK4').css('cursor', cursorProperty);
    };

    self.isDrillInsideShape = function (x, y) {
        return (Raphael.isPointInsidePath(self.getPath(self.viewSide), x, y));
    }

    self.areAllDrillsInsideShape = function (holes) {
        for (var i = 0; i < holes.length; i++) {
            if (holes[i].isOut()) {
                return false;
            }
        }
        return true;
    };

    self.maxhbox = function (resizemode) {
        switch (resizemode) {
            case 0: return (self.hboxR() * 1.5); // 50%
            case 1: return (self.hboxR() * 1.5); // 50% --- testing this value makes no sense, because it can't change in this mode
            case 2: return (self.hboxR() * 1.5); // 50% --- testing this value makes no sense, because it can't change in this mode
            case 3: return (self.hboxR() * 1.5); // 50%
            case 4: return (self.hboxR() * 1.5); // 50%
        }
        return 0;
    };

    self.maxvbox = function (resizemode) {
        switch (resizemode) {
            case 0: return (self.vboxR() * 1.5); // 50%
            case 1: return (self.vboxR() * 1.5); // 50%
            case 2: return (self.vboxR() * 1.5); // 50%
            case 3: return (self.vboxR() * 1.5); // 50% --- testing this value makes no sense, because it can't change in this mode
            case 4: return (self.vboxR() * 1.5); // 50% --- testing this value makes no sense, because it can't change in this mode
        }
        return 0;
    };

    self.minhbox = function (resizemode) {
        switch (resizemode) {
            case 0: return (self.hboxR() * 0.7); // 30%
            case 1: return (self.hboxR() * 0.7); // 30% --- testing this value makes no sense, because it can't change in this mode
            case 2: return (self.hboxR() * 0.7); // 30% --- testing this value makes no sense, because it can't change in this mode
            case 3: return ((self.radiiR[self.idxMaxXR].x - Math.min(self.radiiR[self.idxMaxYR].x, self.radiiR[self.idxMinYR].x)) + 1.0); // temporal: 1mm left of real minimum
            case 4: return ((Math.max(self.radiiR[self.idxMaxYR].x, self.radiiR[self.idxMinYR].x) - self.radiiR[self.idxMinXR].x) + 1.0); // nasal: 1mm right of real minimum
        }
        return 0;
    };

    self.minvbox = function (resizemode) {
        switch (resizemode) {
            case 0: return (self.vboxR() * 0.7); // 30%
            case 1: return ((self.radiiR[self.idxMaxYR].y - Math.min(self.radiiR[self.idxMinXR].y, self.radiiR[self.idxMaxXR].y)) + 1.0); // inferior: 1mm down of real minimum
            case 2: return ((Math.min(self.radiiR[self.idxMaxXR].y, self.radiiR[self.idxMinXR].y) - self.radiiR[self.idxMinYR].y) + 1.0); // superior: 1mm up of real minimum
            case 3: return (self.vboxR() * 0.7); // 30% --- testing this value makes no sense, because it can't change in this mode
            case 4: return (self.vboxR() * 0.7); // 30% --- testing this value makes no sense, because it can't change in this mode
        }
        return 0;
    };

    self.addDrillhole = function () {
        self.Drillholes.sort(function (left, right) {
            var l = Math.min(left.XStart(), left.XEnd());
            var r = Math.min(right.XStart(), right.XEnd());
            return (l === r ? 0 : (l < r ? -1 : 1));
        });

        // first analyse if there are this holes:
        //     --------------
        //   /               )
        //  ( 1 2       3 4 /
        //   \             /
        //    \           /
        //     -----------
        // where 1 and 4 are slots (mentira!!)
        var h1 = null;
        var h2 = null;
        var h3 = null;
        var h4 = null;
        var stdHTemporal = 3.0; // 3 mm above center
        var stdHNasal = 5.5; // 5.5 mm above center
        var stdDiameter = 1.4;
        var i;
        var drillholes = self.Drillholes();

        for (i in drillholes) {
            if (drillholes.hasOwnProperty(i)) {
                var actHole = drillholes[i];
                var maxx;
                var minx;
                if (actHole.XStart() < 0) { // temporal
                    if (h1 === null)
                        h1 = actHole;
                    else {
                        maxx = Math.max(h1.XStart(), h1.XEnd());
                        minx = Math.min(actHole.XStart(), actHole.XEnd());
                        if (maxx > minx) { // because the array was sorted first this should never happens...
                            h2 = h1;
                            h1 = actHole;
                        } else
                            h2 = actHole;
                    }
                    stdHTemporal = h1.YStart();
                    stdHNasal = stdHTemporal + 2.5;
                    stdDiameter = h1.Diameter();
                } else { // nasal
                    if (h3 === null)
                        h3 = actHole;
                    else {
                        maxx = Math.max(h3.XStart(), h3.XEnd());
                        minx = Math.min(actHole.XStart(), actHole.XEnd());
                        if (maxx > minx) { // because the array was sorted first this should never happens...
                            h4 = h3;
                            h3 = actHole;
                        } else
                            h4 = actHole;
                    }
                    stdHNasal = h3.YStart();
                    stdDiameter = h3.Diameter();
                }
            }
        }
        // next: insert first unset hole h1,h2,...
        var newHole = new Drillhole(self);

        //// More of 4 drills are not permitted per lens
        //if (numberOfDrills() >= 8) {
        //    alert(CTXT_VALID_ErrMsgMax4);
        //    newHole = null;
        //    return;
        //}

        var hor;
        if (h1 === null) {
            hor = self.GetXatY(stdHTemporal, 'T', 'B') + 3.0;
            newHole.YStart(stdHTemporal);
            newHole.YEnd(stdHTemporal);
            newHole.XStart(hor - (stdDiameter * 1.0));
            newHole.XEnd(hor - (stdDiameter * 1.0));
        } else if (h2 === null) {
            hor = Math.max(h1.XStart(), h1.XEnd()) + 3.0; //(stdDiameter * 2.0);
            newHole.YStart(stdHTemporal);
            newHole.YEnd(stdHTemporal);
            newHole.XStart(hor);
            newHole.XEnd(hor);
        } else if (h3 === null) {
            hor = self.GetXatY(stdHNasal, 'N', 'B') - 5.0; //(stdDiameter * 2.0);
            newHole.YStart(stdHNasal);
            newHole.YEnd(stdHNasal);
            newHole.XStart(hor);
            newHole.XEnd(hor);
        } else if (h4 === null) {
            hor = Math.max(h3.XStart(), h3.XEnd()) + 3.0; //(stdDiameter * 2.0);
            newHole.YStart(stdHNasal);
            newHole.YEnd(stdHNasal);
            newHole.XStart(hor);
            newHole.XEnd(hor);
        }
        newHole.Diameter(stdDiameter);
        newHole.isSelected(true);
        // abusing the detroy logic for deselecting all:
        self.Drillholes.destroy(function (item) { item.isSelected(false); return false; });
        self.Drillholes.push(newHole);
    };

    self.deleteDrillhole = function () {
        self.Drillholes.remove(function (item) {
            return item.isSelected();
        });
        if (self.Drillholes().length > 0) {
            self.Drillholes()[self.Drillholes().length - 1].isSelected(true);
        }
    };

    self.clear = function () {
        //self.editMode(0); // 0:tracer, 1:spline, 2:rubber, 3:std, 4:drill, 5:resize
        self.hasData(false);
        self.tracerID(0);
        //self.bevelMode(0);
        self.polish(false);
        self.radiiR.length = 0;
        self.radiiL.length = 0;
        self.radiizR.length = 0;
        self.radiizL.length = 0;
        self.Drillholes.remove(function () {
            return true;
        });
        self.isRough(false);
        self.isModified(false);
        self.dbl2(15.0);
        self.hbox2(50.0);
        self.vbox2(30.0);

        self.sides(-1);
        self.traceType('P');
        self.dbl(15.0);
        self.hboxR(0.0);
        self.vboxR(0.0);
        self.hboxL(0.0);
        self.vboxL(0.0);
        self.fpd(0.0);
        self.fcrvR(0.0);
        self.fcrvL(0.0);
        self.ztiltR(0.0);
        self.ztiltL(0.0);
        self.circR(0.0);
        self.circL(0.0);
        self.model = '';
        self.modelName = '';
        self.vendor = '';
        self.angMode = '';
        self.zAngMode = '';
        self.fClass = '';
        //self.activeSide = "B";
        //self.shapeOrigin = shapeSources.EMPTY;
        self.originalDBL = '';
        self.originalHBox = '';
        self.originalVBox = '';
        self.originalHBoxR = '';
        self.originalHBoxL = '';
        self.originalVBoxR = '';
        self.originalVBoxL = '';
        self.originalDBoxL = '';
        self.originalDrillHoles = [];
    };

    self.GetYatX = function (x, side) { // double x, side: R/L
        var yAtMd = -1;
        var minDelta = 999.9;
        var rCount;
        var direction;
        var delta;
        var i;
        if (side === 'L') {
            x = -x; // left side is left-hand-orientated --> use negative X!

            rCount = self.radiiL.length;
            direction = 1; // CCW

            for (i = self.idxMaxXL; i !== self.idxMinXL; i = ((i + rCount + direction) % rCount)) {
                delta = Math.abs(x - self.radiiL[i].x);
                if (delta < minDelta) {
                    minDelta = delta;
                    yAtMd = self.radiiL[i].y;
                }
            }
        } else {
            rCount = self.radiiR.length;
            direction = 1; // CCW
            for (i = self.idxMaxXR; i !== self.idxMinXR; i = ((i + rCount + direction) % rCount)) {
                delta = Math.abs(x - self.radiiR[i].x);
                if (delta < minDelta) {
                    minDelta = delta;
                    yAtMd = self.radiiR[i].y;
                }
            }
        }
        return yAtMd;
    };

    self.GetXatY = function (y, nasalTemporal, side) { // double Y, NasalTemporal 0=nasal 1=temporal, side= R/L)
        var delta;
        var xAtMd = -1;
        var minDelta = 999.9;
        var rCount;
        var direction;
        var i;
        var j;

        if (side === 'L') {
            rCount = self.radiiL.length;
            direction = (nasalTemporal === 'N') ? -1 : 1; // CC / CCW
            for (i = self.idxMaxYL; i !== self.idxMinYL; i = ((i + rCount + direction) % rCount)) {
                j = (i % rCount);
                delta = Math.abs(y - self.radiiL[j].y);
                if (delta < minDelta) {
                    minDelta = delta;
                    xAtMd = self.radiiL[j].x;
                }
            }

            // left side is left-hand-orientated --> use negative X!
            xAtMd = -xAtMd;

        } else {
            rCount = self.radiiR.length;
            direction = (nasalTemporal === 'N') ? -1 : 1; // CC / CCW
            for (i = self.idxMaxYR; i !== self.idxMinYR; i = ((i + rCount + direction) % rCount)) {
                j = (i % rCount);
                delta = Math.abs(y - self.radiiR[j].y);
                if (delta < minDelta) {
                    minDelta = delta;
                    xAtMd = self.radiiR[j].x;
                }
            }
        }

        return xAtMd;
    };

    self.ResizeShape = function (newWidth, newHeight, newDbl, styleType) {
        var oldWidth = Math.max(self.hboxR(), self.hboxL());
        var oldHeight = Math.max(self.vboxR(), self.vboxL());
        // Working on Right side for now
        var x, y, r, a;
        var ratioX = 1.0, ratioY = 1.0;
        var minA = 0;
        var maxA = Math.PI * 2.0;
        var c = 0;

        var l = Math.max(self.radiiR.length, self.radiiL.length);
        var j;

        var radii;
        var hBox;
        var vBox;

        var sides = ["R", "L"];

        for (sd = 0; sd < sides.length; sd++) {

            c = 0;
            radii = sides[sd] === "R" ? self.radiiR : self.radiiL;
            hBox = sides[sd] === "R" ? self.hboxR() : self.hboxL();
            vBox = sides[sd] === "R" ? self.vboxR() : self.vboxL();

            switch (styleType) {
                case 0: // all
                    ratioX = newWidth / hBox;
                    ratioY = newHeight / vBox;
                    break;
                case 1: // inferior
                    ratioX = 1.0;
                    ratioY = newHeight / vBox;
                    //ratioY = (2.0 * newHeight / vBox) - 1.0;
                    minA = Math.PI;
                    break;
                case 2: // superior
                    ratioX = 1.0;
                    ratioY = (2.0 * newHeight / vBox) - 1.0;
                    minA = 0.0;
                    maxA = Math.PI;
                    break;
                case 3: // temporal
                    ratioX = (2.0 * newWidth / vBox) - 1.0;
                    ratioY = 1.0;
                    if (sides[sd] === "R") {
                        minA = Math.PI * 0.5;
                        maxA = Math.PI * 1.5;
                    }
                    else {
                        minA = Math.PI * 1.5;
                        maxA = Math.PI * 2.5;
                    }
                    break;
                case 4: // nasal
                    ratioX = (2.0 * newWidth / hBox) - 1.0;
                    ratioY = 1.0;
                    if (sides[sd] === "L") {
                        minA = Math.PI * 0.5;
                        maxA = Math.PI * 1.5;
                    }
                    else {
                        minA = Math.PI * 1.5;
                        maxA = Math.PI * 2.5;
                    }
                    break;
            }

            for (var i = 0; i < l; i++) {
                j = i % l;
                a = radii[j].ang;
                r = radii[j].rad;
                if (i >= l) a += Math.PI * 2.0;
                if (a > maxA && i == l - 1) a = maxA;

                if ((a <= maxA) && (a >= minA)) {
                    x = r * Math.cos(a) * ratioX;
                    y = r * Math.sin(a) * ratioY;
                    radii[j].x = x;
                    radii[j].y = y;
                    r = Math.sqrt(x * x + y * y);
                    radii[j].rad = r;
                    a = Math.atan2(y, x);
                    if (a <= 0) a += 2.0 * Math.PI;
                    radii[j].ang = a;
                }
            }

            for (i in radii) {
                if (radii.hasOwnProperty(i)) {
                    // calc circ:
                    var j = (l + i - 1) % l;
                    var s = radii[i].rad * radii[i].rad; // a^2
                    s += radii[j].rad * radii[j].rad; // a^2 + b^2
                    var phi = radii[i].ang - radii[j].ang;
                    if (phi <= 0) phi += 2.0 * Math.PI;
                    if (phi > 2.0 * Math.PI) phi -= 2.0 * Math.PI;
                    s -= 2 * radii[i].rad * radii[j].rad * Math.cos(phi); // a^2 + b^2 - 2*a*b*cos(p)
                    c += Math.sqrt(s);
                }
            }

            radii.sort(function (l, r) {
                return (l.ang - r.ang);
            });

            // Apply calculated data to the object
            if (sides[sd] === "R") {
                self.circR(c);
                self.radiiR = radii;
            } else if (sides[sd] === "L") {
                self.circL(c);
                self.radiiL = radii;
            }
        }
        self.angMode = 'U'; // Uneven angles
        self.zAngMode = 'U';
        // Regenerate measurements from new points
        self.CalculateXYnBOX(false);

        self.hboxR(newWidth);
        self.vboxR(newHeight);
        self.hboxL(newWidth);
        self.vboxL(newHeight);

        self.dbl(newDbl);

        self.fpd((self.hboxR() + self.hboxL()) / 2.0 + self.dbl());

        // carbonea: 06/07/2016 - Resize Drills V1
        if (self.Drillholes().length > 0) {
            var deltaW = preciseRound(newWidth) / preciseRound(oldWidth);
            var deltaH = preciseRound(newHeight) / preciseRound(oldHeight);
            var changedW, changedH, changedB = false;
            changedW = (deltaW !== 1);
            changedH = (deltaH !== 1);
            changedB = changedW && changedH;
            var newSize = (newWidth * newHeight) / 2;
            var oldsize = (oldWidth * oldHeight) / 2;
            var ratioStart, ratioEnd, thetaStart, thetaEnd;
            var newXStart, newYStart, newXEnd, newYEnd;
            var newRatioStart, newRatioEnd;
            for (c = 0; c < self.Drillholes().length; c++) {
                var dh = self.Drillholes()[c];
                var sameXEnd = dh.XStart() === dh.XEnd();
                var sameYEnd = dh.YStart() === dh.YEnd();
                ratioStart = Math.pow((Math.pow(dh.XStart(), 2) + Math.pow(dh.YStart(), 2)), 0.5);
                thetaStart = Math.atan(dh.YStart() / dh.XStart());
                if (sameXEnd && sameYEnd) {
                    ratioEnd = ratioStart;
                    thetaEnd = thetaStart;
                } else {
                    ratioEnd = Math.pow((Math.pow(dh.XEnd(), 2) + Math.pow(dh.YEnd(), 2)), 0.5);
                    thetaEnd = Math.atan(dh.YEnd() / dh.XEnd());
                }
                var sizeDelta = preciseRound(newSize) / preciseRound(oldsize);
                newRatioStart = ratioStart * sizeDelta;
                if (sameXEnd && sameYEnd) {
                    newRatioEnd = newRatioStart;
                } else {
                    newRatioEnd = ratioEnd * sizeDelta;
                }
                if (changedW || changedB) {
                    newXStart = newRatioStart * Math.cos(thetaStart);
                    thetaStart < 0 ? dh.XStart(newXStart * -1) : dh.XStart(newXStart);
                    newXEnd = newRatioEnd * Math.cos(thetaEnd);
                    thetaEnd < 0 ? dh.XEnd(newXEnd * -1) : dh.XEnd(newXEnd);
                }
                if (changedH || changedB) {
                    newYStart = newRatioStart * Math.sin(thetaStart);
                    thetaStart < 0 ? dh.YStart(newYStart * -1) : dh.YStart(newYStart);
                    newYEnd = newRatioEnd * Math.sin(thetaEnd);
                    thetaEnd < 0 ? dh.YEnd(newYEnd * -1) : dh.YEnd(newYEnd);
                }
            }
        }
    };

    self.GetRadAt = function (side, ang) {
        var level = Math.PI / 5000.0;
        var diff;
        var minDiff = 9999.0;
        var minIdx = -1;
        var n;
        var i;
        var i2;
        var radii;
        if (side === 'R')
            radii = self.radiiR;
        else
            radii = self.radiiL;

        try {
            n = radii.length;

            // get next point:
            for (i = 0; i < n; i++) {
                diff = Math.abs(radii[i].ang - ang);
                //if (diff > (2d * Math.PI)) diff -= (2D * Math.PI);
                if (diff > Math.PI)
                    diff = Math.abs(diff - (Math.PI * 2));
                // closer than 0.036° (1/10'000) ?
                if (diff < level)
                    return radii[i].rad;
                if (diff < minDiff) {
                    minDiff = diff;// Math.abs(radii[i].ang - ang);
                    minIdx = i;
                }
            }
            // look for neighbor
            i2 = minIdx;
            var loop = 0;
            diff = 0.0;
            var direction = radii[minIdx].ang - ang;
            while (diff < 0.0001) {
                //if (ang < radii[MinIdx].ang)
                if ((direction > 0) && (direction < Math.PI)) {
                    i2 = (i2 + n - 1) % n;
                }
                else {
                    i2 = (i2 + n + 1) % n;
                }

                // Angle between both:
                diff = Math.abs(radii[i2].ang - radii[minIdx].ang);
                if (diff > Math.PI)
                    diff = Math.abs(diff - (Math.PI * 2));

                if (loop++ > 10)
                    throw 'Shape data inconsistent!';
            }

            // diff i.e. 2°, MinDiff i.e. 0.33°
            var scale = minDiff / diff;

            // scale i.e. 1/6
            var v = radii[minIdx].rad * (1 - scale) + radii[i2].rad * scale;
            return v;
        }

        catch (ex) {
            throw 'Error while interpolating';
        }
    };

    self.hboxR.subscribe(function () {
        self.hbox2(self.hboxR());
    });

    self.hboxL.subscribe(function () {
        self.hbox2(self.hboxL());
    });

    self.vboxR.subscribe(function () {
        self.vbox2(self.vboxR());
    });

    self.vboxL.subscribe(function () {
        self.vbox2(self.vboxL());
    });

    self.dbl.subscribe(function () {
        self.dbl2(self.dbl());
    });

    self.MirrorShape = function () {
        /*MIRRORING*/
        if (self.radiiR.length === 0 || self.radiiL.length === 0) {
            switch (self.ShapeDataFromSide) {
                case 'L':
                    if (self.radiiL.length > 0) {
                        self.radiiR = CopySideRadios(self.radiiL);
                        self.fcrvR(self.fcrvL());
                        self.ztiltR(self.ztiltL());
                        self.hboxR(self.hboxL());
                        self.vboxR(self.vboxL());
                    }
                    break;
                case 'R':
                    if (self.radiiR.length > 0) {
                        self.radiiL = CopySideRadios(self.radiiR);
                        self.fcrvL(self.fcrvR());
                        self.ztiltL(self.ztiltR());
                        self.hboxL(self.hboxR());
                        self.vboxL(self.vboxR());
                    }
                    break;
                case 'B':
                    if (self.radiiR.length > 0 && self.radiiL.length === 0) {
                        self.radiiL = CopySideRadios(self.radiiR);
                        self.fcrvL(self.fcrvR());
                        self.ztiltL(self.ztiltR());
                        self.hboxL(self.hboxR());
                        self.vboxL(self.vboxR());
                    } else if (self.radiiL.length > 0 && self.radiiR.length === 0) {
                        self.radiiR = CopySideRadios(self.radiiL);
                        self.fcrvR(self.fcrvL());
                        self.ztiltR(self.ztiltL());
                        self.hboxR(self.hboxL());
                        self.vboxR(self.vboxL());
                    }
                    break;
            };

            self.CopyDrillPoints(self.Drillholes());
            self.ResizeShape(self.hbox, self.vbox, self.dbl(), 0);
            self.hasData(self.radiiR.length > 10 || self.radiiL.length > 10);
        }
        /*END OF MIRRORING*/
    };

    Object.defineProperty(self, 'hbox', {
        get: function () {
            return self.CalculateHBOX(self.hboxR(), self.hboxL());
        }
    });

    Object.defineProperty(self, 'vbox', {
        get: function () {
            return self.CalculateVBOX(self.vboxR(), self.vboxL());
        }
    });

    Object.defineProperty(self, 'sOma', {
        set: function (omaString) {
            //omaLoaded is PRIVATE variable used to store the OMA string in order to modify just
            //necessary properties in GET method
            omaLoaded = omaString.replace(new RegExp('&', 'g'), '&amp;');
            FillShapeData(self, omaLoaded);
            if (self.shapeOrigin === shapeSources.STDSHAPE || self.shapeOrigin === shapeSources.SPLINE || self.shapeOrigin === shapeSources.ETABLET || self.shapeOrigin === shapeSources.TRACER)
                self.MirrorShape();

            ////// handle drawn or std shapes: scale up to 1024 points
            //if ((self.radiiR.length < 500) && (self.radiiR.length > 30)) {
            //    self.isRough(true);
            //    if (self.angMode === 'U') {
            //        self.radiiR.sort(function (l, r) {
            //            return (l.ang - r.ang);
            //        });
            //    }

            //    var newRadiiR = [];
            //    for (var i = 0; i < 1024; i++) {
            //        var ang = Math.PI * i / 512.0;
            //        var r = self.GetRadAt("R", ang);
            //        var obj = {
            //            rad: r, ang: ang, x: Math.cos(ang) * r, y: Math.sin(ang) * r
            //        };
            //        newRadiiR.push(obj);
            //    }
            //    self.radiiR = newRadiiR;
            //}

            //if ((self.radiiL.length < 500) && (self.radiiL.length > 30)) {
            //    self.isRough(true);
            //    if (self.angMode === 'U') {
            //        self.radiiL.sort(function (l, r) {
            //            return (l.ang - r.ang);
            //        });
            //    }

            //    var newRadiiL = [];
            //    for (var i = 0; i < 1024; i++) {
            //        var ang = Math.PI * i / 512.0;
            //        var r = self.GetRadAt("L", ang);
            //        var obj = {
            //            rad: r, ang: ang, x: Math.cos(ang) * r, y: Math.sin(ang) * r
            //        };
            //        newRadiiL.push(obj);
            //    }
            //    self.radiiL = newRadiiL;
            //}

            self.CalculateXYnBOX(false);

            self.hasData(self.radiiR.length > 10 || self.radiiL.length > 10);

        },
        get: function () {
            var omaString = '';
            if ((self.radiiR.length > 0 || self.radiiL.length > 0)) {
                if (self.shapeOrigin !== shapeSources.IMPTRACE && self.shapeOrigin !== shapeSources.IMPRSHAPE && self.shapeOrigin !== shapeSources.TRACER && self.shapeOrigin !== shapeSources.FILE) {
                    omaString += 'REQ=FIL\r\n';
                    omaString += 'DEV=TRC\r\n';
                    omaString += 'JOB="' + self.JobReference() + '"\r\n';
                    if (self.model !== '')
                        omaString += 'MODEL=' + self.model + '\r\n';
                    else
                        omaString += 'MODEL=ESMNG\r\n';
                    if (self.modelName !== '')
                        omaString += 'MNAME=' + self.modelName + '\r\n';
                    else
                        omaString += 'MNAME=ESMNG\r\n';

                    if (self.vendor !== '')
                        omaString += 'VEN=' + self.vendor + '\r\n';
                    else
                        omaString += 'VEN=ESMNG\r\n';
                    omaString += 'OMAV=3.07\r\n';
                    omaString += 'CIRC=' + self.circR().toFixed(2) + ';' + self.circL().toFixed(2) + '\r\n'; //125.66;125.66\r\n";
                    omaString += 'HBOX=' + self.hboxR().toFixed(2) + ';' + self.hboxL().toFixed(2) + '\r\n';
                    omaString += 'VBOX=' + self.vboxR().toFixed(2) + ';' + self.vboxL().toFixed(2) + '\r\n';
                    omaString += 'DBL=' + self.dbl().toFixed(2) + '\r\n';
                    omaString += 'ZTILT=' + self.ztiltR().toFixed(2) + ';' + self.ztiltL().toFixed(2) + '\r\n';
                    omaString += 'FCRV=' + self.fcrvR().toFixed(2) + ';' + self.fcrvL().toFixed(2) + '\r\n';
                    omaString += '_TRCSIDE=B\r\n';
                    omaString += 'FTYP=' + self.frameType() + '\r\n';
                    switch (self.frameType()) {
                        case '1': // plastic
                            omaString += 'ETYP=1\r\n'; // bevel
                            break;
                        case '2': // metal
                            omaString += 'ETYP=1\r\n'; // bevel
                            break;
                        case '3': // drill
                            omaString += 'ETYP=2\r\n'; // rimless
                            break;
                        case '4': // nylor
                            omaString += 'ETYP=3\r\n'; // groove
                            break;
                        default: // i.e. PATTERN
                            omaString += 'ETYP=-1\r\n'; // uncut
                            break;
                    }
                    switch (self.bevelMode()) {
                        case '-1': // none
                            omaString += 'BEVP=0\r\n'; // manual
                            break;
                        case '0': // auto
                            omaString += 'BEVP=7\r\n'; // auto
                            break;
                        case '1': // 50:50
                            omaString += 'BEVP=4\r\n'; // 50:50
                            break;
                        case '2': // 1:2
                            omaString += 'BEVP=2\r\n'; // bevel
                            omaString += 'BEVM=33\r\n'; // bevel
                            break;
                        case '3': // front
                            omaString += 'BEVP=1\r\n'; // bevel
                            break;
                    }

                    if (self.polish())
                        omaString += 'POLISH=1\r\n'; // polish
                    if (self.fClass !== '')
                        omaString += '_FCLASS=' + self.fClass + '\r\n'; // polish
                    if (self.radiiR.length > 0) {
                        omaString += 'TRCFMT=1;' + self.radiiR.length + ';' + self.angMode + ';R;' + self.traceType();
                        var auxA = '';
                        var i;
                        for (i = 0; i < self.radiiR.length; i++) {
                            if ((i % 8) === 0) {
                                omaString += '\r\nR=';
                                auxA += '\r\nA=';
                            }

                            //var ang = Math.PI * i / 512.0;
                            //var r = self.GetRadAt("R", ang) * 100;
                            omaString += (self.radiiR[i].rad * 100).toFixed(0);

                            if (self.angMode === 'U') {
                                auxA += (self.radiiR[i].ang * (180 / Math.PI) * 100).toFixed(0);
                            }

                            if (((i + 1) % 8) !== 0 && i < self.radiiR.length - 1) {
                                omaString += ';';
                                auxA += ';';
                            }
                        }
                        if (self.angMode === 'U')
                            omaString += auxA;
                    }
                    // Inclucing Z coordinate for right eye
                    if (self.radiizR.length > 0) {
                        omaString += '\r\n';
                        auxzA = '';
                        omaString += 'ZFMT=1;' + self.radiizR.length + ';' + self.zAngMode + ';R;' + self.traceType();
                        for (i = 0; i < self.radiizR.length; i++) {
                            if ((i % 8) === 0) {
                                omaString += '\r\nZ=';
                                auxzA += '\r\nZA=';
                            }

                            omaString += (self.radiizR[i].rad * 100).toFixed(0);

                            if (self.zAngMode === 'U') {
                                auxzA += (self.radiizR[i].ang * (180 / Math.PI) * 100).toFixed(0);
                            }

                            if (((i + 1) % 8) !== 0 && i < self.radiizR.length - 1) {
                                omaString += ';';
                                auxzA += ';';
                            }
                        }
                        if (self.zAngMode === 'U')
                            omaString += auxzA;
                    }
                    if (self.radiiL.length > 0) {
                        omaString += '\r\n';
                        auxA = '';
                        omaString += 'TRCFMT=1;' + self.radiiL.length + ';' + self.angMode + ';L;' + self.traceType();
                        for (i = 0; i < self.radiiL.length; i++) {
                            if ((i % 8) === 0) {
                                omaString += '\r\nR=';
                                auxA += '\r\nA=';
                            }

                            omaString += (self.radiiL[i].rad * 100).toFixed(0);

                            if (self.angMode === 'U') {
                                auxA += (self.radiiL[i].ang * (180 / Math.PI) * 100).toFixed(0);
                            }

                            if (((i + 1) % 8) !== 0 && i < self.radiiL.length - 1) {
                                omaString += ';';
                                auxA += ';';
                            }
                        }
                        if (self.angMode === 'U')
                            omaString += auxA;
                    }
                    // Inclucing Z coordinate for left eye
                    if (self.radiizL.length > 0) {
                        omaString += '\r\n';
                        auxzA = '';
                        omaString += 'ZFMT=1;' + self.radiizL.length + ';' + self.zAngMode + ';L;' + self.traceType();
                        for (i = 0; i < self.radiizL.length; i++) {
                            if ((i % 8) === 0) {
                                omaString += '\r\nZ=';
                                auxzA += '\r\nZA=';
                            }

                            omaString += (self.radiizL[i].rad * 100).toFixed(0);

                            if (self.zAngMode === 'U') {
                                auxzA += (self.radiizL[i].ang * (180 / Math.PI) * 100).toFixed(0);
                            }

                            if (((i + 1) % 8) !== 0 && i < self.radiizL.length - 1) {
                                omaString += ';';
                                auxzA += ';';
                            }
                        }
                        if (self.zAngMode === 'U')
                            omaString += auxzA;
                    }
                    omaString += '\r\n';

                    if (self.isModified()) {
                        omaString += '_MODIFIED=1\r\n';
                        if (self.originalDBL !== '' && self.dbl() !== self.originalDBL) {
                            omaString += '_ORGDBL=' + self.dbl().toFixed(2) + '\r\n';
                        }
                        if ((self.originalHBoxL !== '' && self.hboxL() !== self.originalHBoxL) || self.originalHBoxR !== '' && self.hboxR() !== self.originalHBoxR) {
                            omaString += '_ORGHBOX=' + ((self.activeSide === 'B' || self.activeSide === 'R') ? self.originalHBoxR : + '?') + ';' + ((self.activeSide === 'B' || self.activeSide === 'L') ? self.originalHBoxL : '?') + '\r\n';
                        }
                        if ((self.originalVBoxL !== '' && self.vboxL() !== self.originalVBoxL) || self.originalVBoxR !== '' && self.vboxR() !== self.originalVBoxR) {
                            omaString += '_ORGVBOX=' + ((self.activeSide === 'B' || self.activeSide === 'R') ? self.originalVBoxR : + '?') + ';' + ((self.activeSide === 'B' || self.activeSide === 'L') ? self.originalVBoxL : '?') + '\r\n';
                        }
                    };
                    var drillHoles = self.Drillholes();
                    for (var drillIndex = 0; drillIndex < drillHoles.length; drillIndex++) {
                        omaString += getDrills(drillHoles[drillIndex]);
                    }
                } else {
                    omaString = self.GetOmaModified();
                }

            }

            if ((self.radiiR.length > 0 && self.radiiL.length > 0) && ((omaString.indexOf("DBL=")) === -1)) //Two Eyes shape, must have DBL
                omaString += "DBL=" + self.dbl() + "\r\n";
            if ((self.shapeOrigin === shapeSources.FILE || self.shapeOrigin === shapeSources.TRACER) &&
                (omaString.indexOf("\r\nFTYP=") === -1)) {
                omaString += 'FTYP=' + self.frameType() + '\r\n';
                if (self.fClass !== '' &&
                    (omaString.indexOf("\r\n_FCLASS=") === -1)) {
                    omaString += '_FCLASS=' + self.fClass + '\r\n';
                }
            }
            var lines = omaLoaded.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/);
            var additionalInformation = extractAdditionalInfoFromOMA(lines);
            $(additionalInformation).each(function (index, info) {
                if (omaString.indexOf(info) === -1) {
                    if (!endsWith(omaString, '\r\n')) {
                        omaString += '\r\n' + info;
                    } else {
                        omaString += info;
                    }
                }
            });
            return omaString;
        }
    });

    function getDrills(dh) {
        var dhs = 'DRILLE=';
        dhs += dh.FaceSide(); // 'B/R/L'
        dhs += ';';
        if (dh.XOrigin() !== 'C') {
            dhs += dh.XReference(); // If Center, no orientation (Nasal or Temporal) is needed.
        } else {
            dhs += dh.XOrigin(); // 'B/E/C'
            dhs += dh.MountingSide(); // 'F/R'
        }
        var xStart = 0.00;
        if (dh.XStart2Show() !== '') {
            xStart = parseFloat(dh.XStart2Show()).toFixed(2);
        }
        dhs += ';' + xStart;
        var yStart = 0.00;
        if (dh.YStart2Show() !== '') {
            yStart = parseFloat(dh.YStart2Show()).toFixed(2);
        }
        dhs += ';' + yStart;
        dhs += ';' + parseFloat(dh.Diameter()).toFixed(2);
        var xEnd = xStart;
        if (dh.XEnd2Show() !== '') {
            xEnd = parseFloat(dh.XEnd2Show()).toFixed(2);
        }
        dhs += ';' + xEnd;
        var yEnd = yStart;
        if (dh.YEnd2Show() !== '') {
            yEnd = parseFloat(dh.YEnd2Show()).toFixed(2);
        }
        dhs += ';' + yEnd;
        dhs += ';' + parseFloat(dh.Depth()).toFixed(2);
        dhs += ';' + dh.HoleType();
        dhs += ';' + dh.AngleMode();
        if (dh.AngleMode() === 'A') {
            dhs += ';' + dh.LateralAngle();
            dhs += ';' + dh.VerticalAngle();
        }
        dhs += '\r\n';

        return dhs;
    };

    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    self.CalculateXYnBOX = function (regenerateMeasures) {
        var maxxR = 0.0;
        var minxR = 0.0;
        var maxxL = 0.0;
        var minxL = 0.0;
        var maxyR = 0.0;
        var minyR = 0.0;
        var maxyL = 0.0;
        var minyL = 0.0;
        var curObj;
        var i;

        for (i = 0; i < self.radiiR.length; i++) {
            curObj = self.radiiR[i];
            curObj.x = Math.cos(curObj.ang) * curObj.rad;
            curObj.y = Math.sin(curObj.ang) * curObj.rad;
            if (curObj.x > maxxR) {
                maxxR = curObj.x; self.idxMaxXR = i;
            }
            if (curObj.x < minxR) {
                minxR = curObj.x; self.idxMinXR = i;
            }
            if (curObj.y > maxyR) {
                maxyR = curObj.y; self.idxMaxYR = i;
            }
            if (curObj.y < minyR) {
                minyR = curObj.y; self.idxMinYR = i;
            }
        }

        for (i = 0; i < self.radiiL.length; i++) {
            curObj = self.radiiL[i];
            curObj.x = Math.cos(curObj.ang) * curObj.rad;
            curObj.y = Math.sin(curObj.ang) * curObj.rad;
            if (curObj.x > maxxL) {
                maxxL = curObj.x; self.idxMaxXL = i;
            }
            if (curObj.x < minxL) {
                minxL = curObj.x; self.idxMinXL = i;
            }
            if (curObj.y > maxyL) {
                maxyL = curObj.y; self.idxMaxYL = i;
            }
            if (curObj.y < minyL) {
                minyL = curObj.y; self.idxMinYL = i;
            }
        }

        if (regenerateMeasures) {
            self.hboxR(maxxR - minxR);
            self.vboxR(maxyR - minyR);
            self.hboxL(maxxL - minxL);
            self.vboxL(maxyL - minyL);
        }
        self.fpd(((maxxR - minxR) + (maxxL - minxL)) / 2.0 + self.dbl());

    };

    self.CopySideRadios = CopySideRadios;

    self.CopyDrillPoints = CopyDrillPoints;

    self.GetOmaModified = function () {
        var isXml = isXML(omaLoaded);
        var oma = omaLoaded;
        if (isXml) {
            oma = $(omaLoaded).find('Data[Type="Oma"]').text().trim();
        }

        var mandatoryNodesToRegenerate = ['FTYP', 'ETYP'];
        oma = RegenerateNodes(mandatoryNodesToRegenerate, oma);
        var lines = oma.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/);
        var nodesToRegenerateFromClass = ['CIRC', 'HBOX', 'VBOX', 'DBL', 'FTYP', 'ETYP', 'BEVP', 'TRCFMT', 'R', 'A', 'DRILL', 'DRILLE', '_FCLASS', 'ZTILT', 'FCRV'];
        var nodesZ = ['Z', 'ZFMT', 'ZA'];
        var omaString = '';
        for (var actline in lines) {
            if (lines.hasOwnProperty(actline)) {
                var parts = lines[actline].split('=');
                if (parts.length > 0 && parts[0] !== '' && nodesToRegenerateFromClass.indexOf(parts[0]) === -1) {
                    if ((self.isModified() && nodesZ.indexOf(parts[0]) === -1) || !self.isModified())
                        omaString += parts[0] + '=' + parts[1] + '\r\n';;
                } else
                    switch (parts[0]) {
                        case 'CIRC':
                            omaString += 'CIRC=' +
                                ((self.activeSide === 'B' || self.activeSide === 'R')
                                    ? ReplaceNaN(self.circR().toFixed(2))
                                    : '?') +
                                ';' +
                                ((self.activeSide === 'B' || self.activeSide === 'L')
                                    ? ReplaceNaN(self.circL().toFixed(2))
                                    : '?') +
                                '\r\n'; //125.66;125.66\r\n";
                            break;
                        case 'HBOX':
                            omaString += 'HBOX=' +
                                ((self.activeSide === 'B' || self.activeSide === 'R')
                                    ? ReplaceNaN(self.hboxR().toFixed(2))
                                    : + '?') +
                                ';' +
                                ((self.activeSide === 'B' || self.activeSide === 'L')
                                    ? ReplaceNaN(self.hboxL().toFixed(2))
                                    : '?') +
                                '\r\n';
                            break;
                        case 'VBOX':
                            omaString += 'VBOX=' +
                                ((self.activeSide === 'B' || self.activeSide === 'R')
                                    ? ReplaceNaN(self.vboxR().toFixed(2))
                                    : +'?') +
                                ';' +
                                ((self.activeSide === 'B' || self.activeSide === 'L')
                                    ? ReplaceNaN(self.vboxL().toFixed(2))
                                    : '?') +
                                '\r\n';
                            break;
                        case 'DBL':
                            omaString += 'DBL=' + self.dbl().toFixed(2) + '\r\n';
                            break;
                        case 'FTYP':
                            omaString += 'FTYP=' + self.frameType() + '\r\n';
                            if (self.fClass != '' && omaString.indexOf("\r\n_FCLASS=") === -1)
                                omaString += '_FCLASS=' + self.fClass + '\r\n';
                            break;
                        case 'ETYP':
                            switch (self.frameType()) {
                                case '1': // plastic
                                    omaString += 'ETYP=1\r\n'; // bevel
                                    break;
                                case '2': // metal
                                    omaString += 'ETYP=1\r\n'; // bevel
                                    break;
                                case '3': // drill
                                    omaString += 'ETYP=2\r\n'; // rimless
                                    break;
                                case '4': // nylor
                                    omaString += 'ETYP=3\r\n'; // groove
                                    break;
                                default: // i.e. PATTERN
                                    omaString += 'ETYP=-1\r\n'; // uncut
                                    break;
                            };
                            break;
                        case 'BEVP':
                            switch (self.bevelMode()) {
                                case '-1': // none
                                    omaString += 'BEVP=0\r\n'; // manual
                                    break;
                                case '0': // auto
                                    omaString += 'BEVP=7\r\n'; // auto
                                    break;
                                case '1': // 50:50
                                    omaString += 'BEVP=4\r\n'; // 50:50
                                    break;
                                case '2': // 1:2
                                    omaString += 'BEVP=2\r\n'; // bevel
                                    omaString += 'BEVM=33\r\n'; // bevel
                                    break;
                                case '3': // front
                                    omaString += 'BEVP=1\r\n'; // bevel
                                    break;
                            };
                            break;
                        case 'ZTILT':
                            if (isNaN(self.ztiltR()) && isNaN(self.ztiltL())) {
                                break;
                            } else {
                                omaString += 'ZTILT=';
                                if (self.activeSide === 'B') {
                                    CopyNaNZTILT(self);
                                    omaString += self.ztiltR().toFixed(2) + ';' + self.ztiltL().toFixed(2);
                                } else {
                                    omaString += (self.activeSide === 'R' ? ReplaceNaN(self.ztiltR().toFixed(2)) : '?')
                                        + ';' +
                                        (self.activeSide === 'L' ? ReplaceNaN(self.ztiltL().toFixed(2)) : '?');
                                }
                                omaString += '\r\n';
                            }
                            break;
                        case 'FCRV':
                            omaString += 'FCRV=' +
                                ((self.activeSide === 'B' || self.activeSide === 'R')
                                    ? ReplaceNaN(self.fcrvR().toFixed(2))
                                    : +'?') +
                                ';' +
                                ((self.activeSide === 'B' || self.activeSide === 'L')
                                    ? ReplaceNaN(self.fcrvL().toFixed(2))
                                    : '?') +
                                '\r\n';
                            break;
                    };
            }
        };
        var i;
        var auxA;
        var auxzA;
        if (self.radiiR.length > 0 && (self.activeSide === 'B' || self.activeSide === 'R')) {
            omaString += 'TRCFMT=1;' + self.radiiR.length + ';' + self.angMode + ';R;' + self.traceType();
            auxA = '';
            for (i = 0; i < self.radiiR.length; i++) {
                if ((i % 8) === 0) {
                    omaString += '\r\nR=';
                    auxA += '\r\nA=';
                }
                // var ang = Math.PI * i / 512.0;
                // var r = self.GetRadAt("R", ang) * 100;
                omaString += (self.radiiR[i].rad * 100).toFixed(0);
                if (self.angMode === 'U') {
                    auxA += (self.radiiR[i].ang * (180 / Math.PI) * 100).toFixed(0);
                }
                if (((i + 1) % 8) !== 0 && i < self.radiiR.length - 1) {
                    omaString += ';';
                    if (i < self.radiiR.length)
                        auxA += ';';
                }
            }
            if (self.angMode === 'U') {
                omaString += auxA;
            }
            omaString += '\r\n';
        };
        if (self.radiizR.length > 0 && (self.zActiveSide === 'B' || self.zActiveSide === 'R')) {
            omaString += 'ZFMT=1;' + self.radiizR.length + ';' + self.zAngMode + ';R;' + self.traceType();
            auxzA = '';
            for (i = 0; i < self.radiizR.length; i++) {
                if ((i % 8) === 0) {
                    omaString += '\r\nZ=';
                    auxzA += '\r\nZA=';
                }
                // var ang = Math.PI * i / 512.0;
                // var r = self.GetRadAt("R", ang) * 100;
                omaString += (self.radiizR[i].rad * 100).toFixed(0);
                if (self.zAngMode === 'U') {
                    auxzA += (self.radiizR[i].ang * (180 / Math.PI) * 100).toFixed(0);
                }
                if (((i + 1) % 8) !== 0 && i < self.radiizR.length - 1) {
                    omaString += ';';
                    if (i < self.radiizR.length)
                        auxzA += ';';
                }
            }
            if (self.zAngMode === 'U') {
                omaString += auxzA;
            }
            omaString += '\r\n';
        };
        if (self.radiiL.length > 0 && (self.activeSide === 'B' || self.activeSide === 'L')) {
            auxA = '';
            omaString += 'TRCFMT=1;' + self.radiiL.length + ';' + self.angMode + ';L;' + self.traceType();
            for (i = 0; i < self.radiiL.length; i++) {
                if ((i % 8) === 0) {
                    omaString += '\r\nR=';
                    auxA += '\r\nA=';
                }
                omaString += (self.radiiL[i].rad * 100).toFixed(0);
                if (self.angMode === 'U') {
                    auxA += (self.radiiL[i].ang * (180 / Math.PI) * 100).toFixed(0);
                }
                if (((i + 1) % 8) !== 0 && i < self.radiiL.length - 1) {
                    omaString += ';';
                    if (i < self.radiiL.length)
                        auxA += ';';
                }
            }
            if (self.angMode === 'U') {
                omaString += auxA;
            }
            omaString += '\r\n';
        };
        if (self.radiizL.length > 0 && (self.zActiveSide === 'B' || self.zActiveSide === 'L')) {
            omaString += 'ZFMT=1;' + self.radiizL.length + ';' + self.zAngMode + ';L;' + self.traceType();
            auxzA = '';
            for (i = 0; i < self.radiizL.length; i++) {
                if ((i % 8) === 0) {
                    omaString += '\r\nZ=';
                    auxzA += '\r\nZA=';
                }
                // var ang = Math.PI * i / 512.0;
                // var r = self.GetRadAt("R", ang) * 100;
                omaString += (self.radiizL[i].rad * 100).toFixed(0);
                if (self.zAngMode === 'U') {
                    auxzA += (self.radiizL[i].ang * (180 / Math.PI) * 100).toFixed(0);
                }
                if (((i + 1) % 8) !== 0 && i < self.radiizL.length - 1) {
                    omaString += ';';
                    if (i < self.radiizL.length)
                        auxzA += ';';
                }
            }
            if (self.zAngMode === 'U') {
                omaString += auxzA;
            }
            omaString += '\r\n';
        };
        if (self.isModified() && omaString.indexOf("_MODIFIED=1") == -1) {
            omaString += '_MODIFIED=1\r\n';
            if (self.originalDBL !== '' && self.dbl() !== self.originalDBL) {
                omaString += '_ORGDBL=' + self.dbl().toFixed(2) + '\r\n';
            }
            if ((self.originalHBoxL !== '' && self.hboxL() !== self.originalHBoxL) || self.originalHBoxR !== '' && self.hboxR() !== self.originalHBoxR) {
                omaString += '_ORGHBOX=' + ((self.activeSide === 'B' || self.activeSide === 'R') ? self.originalHBoxR : + '?') + ';' + ((self.activeSide === 'B' || self.activeSide === 'L') ? self.originalHBoxL : '?') + '\r\n';
            }
            if ((self.originalVBoxL !== '' && self.vboxL() !== self.originalVBoxL) || self.originalVBoxR !== '' && self.vboxR() !== self.originalVBoxR) {
                omaString += '_ORGVBOX=' + ((self.activeSide === 'B' || self.activeSide === 'R') ? self.originalVBoxR : + '?') + ';' + ((self.activeSide === 'B' || self.activeSide === 'L') ? self.originalVBoxL : '?') + '\r\n';
            }
        };
        var drillHoles = self.Drillholes();
        for (i = 0; i < drillHoles.length; i++) {
            omaString += getDrills(drillHoles[i]);
        }

        return omaString;
    };

    function RegenerateNodes(mandatoryNodes, oma) {
        for (var node in mandatoryNodes) {
            switch (mandatoryNodes[node]) {
                case 'FTYP':
                    if (self.frameType() !== '' && oma.indexOf("\r\nFTYP=") === -1)
                        oma += 'FTYP=' + self.frameType() + '\r\n';
                    break;
                case 'ETYP':
                    if (self.frameType() !== '' && oma.indexOf("\r\nETYP=") === -1) {
                        switch (self.frameType()) {
                            case '1': // plastic
                                oma += 'ETYP=1\r\n'; // bevel
                                break;
                            case '2': // metal
                                oma += 'ETYP=1\r\n'; // bevel
                                break;
                            case '3': // drill
                                oma += 'ETYP=2\r\n'; // rimless
                                break;
                            case '4': // nylor
                                oma += 'ETYP=3\r\n'; // groove
                                break;
                            default: // i.e. PATTERN
                                oma += 'ETYP=-1\r\n'; // uncut
                                break;
                        }
                    };
                    break;
            }
        }
        return oma;
    }

    self.RemoveEyeFromOMA = function (sideToRemove, useInternalOma, sOma) {
        if (!useInternalOma) {
            self.sOma = sOma;
        };

        if (self.radiiR.length > 0 && self.radiiL.length > 0) {
            switch (sideToRemove) {
                case 'R':
                    self.radiiR = [];
                    self.activeSide = 'L';
                    break;
                case 'L':
                    self.radiiL = [];
                    self.activeSide = 'R';
                    break;
            }
        }

        return self.sOma;
    };

    self.CalculateHBOX = function (hboxR, hboxL) {
        var hboxRIsValid = (!isNaN(hboxR));// && hboxR.toString().indexOf('.') !== -1);
        var hboxLIsValid = (!isNaN(hboxL));// && hboxL.toString().indexOf('.') !== -1);
        if (hboxRIsValid && hboxLIsValid) {
            if (hboxR > 0 && hboxL > 0) {
                return parseFloat(((hboxR + hboxL) / 2).toFixed(2));
            } else if (hboxR > 0) {
                return parseFloat(hboxR.toFixed(2));
            } else if (hboxL > 0) {
                return parseFloat(hboxL.toFixed(2));
            } else {
                return 0;
            }
        } else if (hboxRIsValid) {
            return parseFloat((hboxR).toFixed(2));
        } else if (hboxLIsValid) {
            return parseFloat((hboxL).toFixed(2));
        } else {
            return 0;
        }
    };

    self.CalculateVBOX = function (vboxR, vboxL) {
        var vboxRIsValid = (!isNaN(vboxR));// && vboxR.toString().indexOf('.') !== -1);
        var vboxLIsValid = (!isNaN(vboxL));// && vboxL.toString().indexOf('.') !== -1);
        if (vboxRIsValid && vboxLIsValid) {
            if (vboxR > 0 && vboxL > 0) {
                return parseFloat(((vboxR + vboxL) / 2).toFixed(2));
            } else if (vboxR > 0) {
                return parseFloat(vboxR.toFixed(2));
            } else if (vboxL > 0) {
                return parseFloat(vboxL.toFixed(2));
            } else {
                return 0;
            }
        } else if (vboxRIsValid) {
            return parseFloat((vboxR).toFixed(2));
        } else if (vboxLIsValid) {
            return parseFloat((vboxL).toFixed(2));
        } else {
            return 0;
        }
    };
};

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}

function extractAdditionalInfoFromOMA(lines) {
    var additionalInformation = [];
    if (lines) {
        additionalInformation = $(lines).filter(function (index, info) {
            return info.startsWith('_') && info.indexOf('_FCLASS') === -1
                && info.indexOf('_ORGDBL') === -1 && info.indexOf('_ORGHBOX') === -1
                && info.indexOf('_ORGVBOX') === -1 && info.indexOf('_MODIFIED') === -1
                && info.indexOf('_TRCSIDE') === -1 || info.indexOf('FRAM') !== -1;
        });
    }
    return additionalInformation;
}

function isXML(xml) {
    try {
        $.parseXML(xml); //is valid XML
        return true;
    } catch (err) {
        // was not XML
        return false;
    }
}

function ReplaceNaN(value) {
    if (isNaN(value))
        return '?';
    else
        return value;
};

function CopySideRadios(radios) {
    var newRads = [];
    $(radios).each(function (index, item) {
        var newAng = Math.PI - item.ang;
        if (newAng < 0)
            newAng += Math.PI * 2.0;

        var obj = {
            rad: item.rad, ang: newAng, x: -item.x, y: item.y
        };
        newRads.push(obj);
    });
    newRads.sort(function (l, r) {
        return (l.ang - r.ang);
    });
    return newRads;
}

function CopyDrillPoints(drillHoles) {
    $(drillHoles).each(function (index, item) {
        item.FaceSide('B');
    });
}

function FillShapeData(shapeDataObject, omaString) {
    shapeDataObject.hasData(false);
    shapeDataObject.clear();
    var side = '';
    var zSide = '';
    var count = 0;
    var zCount = 0;
    var phistep = 0;
    var zPhistep = 0;
    var aCounter = 0;
    var zACounter = 0;
    var drilleRecords = []; // DRILLE records can be processed just after shape generation, because the XReference can refer to the shape edge which needs to be known. So use this array to store the records and process after shape generation...
    var phi = 0.0;
    var zPhi = 0.0;

    var lines = omaString.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/);
    var minus4Left;
    var dpr;
    var values;
    for (var actline in lines) {
        if (lines.hasOwnProperty(actline)) {
            var parts = lines[actline].split('=');
            if (parts.length === 2) {
                values = parts[1].split(';');
                var radval;
                switch (parts[0]) {
                    case 'MODEL':
                        if (parts[1] && parts[1] !== '')
                            shapeDataObject.model = parts[1].toString();
                        else
                            shapeDataObject.model = '';
                        break;
                    case 'MNAME':
                        if (parts[1] && parts[1] !== '')
                            shapeDataObject.modelName = parts[1].toString();
                        else
                            shapeDataObject.modelName = '';
                        break;
                    case 'VEN':
                        if (parts[1] && parts[1] !== '')
                            shapeDataObject.vendor = parts[1].toString();
                        else
                            shapeDataObject.vendor = '';
                        break;
                    case 'TRCFMT':
                        side = values[3];
                        shapeDataObject.angMode = values[2];
                        count = values[1];
                        if ((values.length > 4) && values[4] === 'F')
                            shapeDataObject.traceType('F');
                        else
                            shapeDataObject.traceType('P');
                        phistep = Math.PI * 2 / count;
                        phi = 0.0;
                        aCounter = 0;
                        shapeDataObject.ShapeDataFromSide = side;
                        if (side === 'R')
                            shapeDataObject.radiiR.length = 0;
                        else
                            shapeDataObject.radiiL.length = 0;
                        break;
                    case 'ZFMT':
                        zSide = values[3];
                        shapeDataObject.zAngMode = values[2];
                        zCount = values[1];
                        zPhistep = Math.PI * 2 / count;
                        zPhi = 0.0;
                        zACounter = 0;
                        if (zSide === 'R')
                            shapeDataObject.radiizR.length = 0;
                        else
                            shapeDataObject.radiizL.length = 0;
                        break;
                    case 'R':
                        for (radval in values) {
                            if (values.hasOwnProperty(radval) && !isNaN(values[radval])) {
                                var obj = {
                                    rad: 0,
                                    ang: 0,
                                    x: 0,
                                    y: 0
                                };
                                obj.rad = parseFloat(values[radval].replace(/[^\.\d]/g, '')) / 100.0;
                                phi += phistep;
                                obj.ang = phi;
                                switch (side) {
                                    case 'R':
                                        shapeDataObject.radiiR.push(obj);
                                        break;
                                    case 'L':
                                        shapeDataObject.radiiL.push(obj);
                                        break;
                                }
                            }
                        }
                        break;
                    case 'Z':
                        for (radval in values) {
                            if (values.hasOwnProperty(radval) && !isNaN(values[radval])) {
                                var obj = {
                                    rad: 0,
                                    ang: 0,
                                    x: 0,
                                    y: 0
                                };
                                obj.rad = parseFloat(values[radval].replace(/[^\.\d]/g, '')) / 100.0;
                                zPhi += zPhistep;
                                obj.ang = zPhi;
                                switch (zSide) {
                                    case 'R':
                                        shapeDataObject.radiizR.push(obj);
                                        break;
                                    case 'L':
                                        shapeDataObject.radiizL.push(obj);
                                        break;
                                }
                            }
                        }
                        break;
                    case 'A':
                        for (radval in values) {
                            if (values.hasOwnProperty(radval) && !isNaN(values[radval])) {
                                var curObj;
                                switch (side) {
                                    case 'R':
                                        curObj = shapeDataObject.radiiR[aCounter];
                                        if (curObj) {
                                            curObj.ang = (parseFloat(values[radval].replace(/[^\.\d]/g, '')) / 18000.0) * Math.PI;
                                        }
                                        break;
                                    case 'L':
                                        curObj = shapeDataObject.radiiL[aCounter];
                                        if (curObj) {
                                            curObj.ang = (parseFloat(values[radval].replace(/[^\.\d]/g, '')) / 18000.0) * Math.PI;
                                        }
                                        break;
                                }
                                aCounter++;
                            }
                        }
                        break;
                    case 'ZA':
                        for (radval in values) {
                            if (values.hasOwnProperty(radval) && !isNaN(values[radval])) {
                                var curObj;
                                switch (zSide) {
                                    case 'R':
                                        curObj = shapeDataObject.radiizR[zACounter];
                                        if (curObj) {
                                            curObj.ang = (parseFloat(values[radval].replace(/[^\.\d]/g, '')) / 18000.0) * Math.PI;
                                        }
                                        break;
                                    case 'L':
                                        curObj = shapeDataObject.radiizL[zACounter];
                                        if (curObj) {
                                            curObj.ang = (parseFloat(values[radval].replace(/[^\.\d]/g, '')) / 18000.0) * Math.PI;
                                        }
                                        break;
                                }
                                zACounter++;
                            }
                        }
                        break;
                    case 'DRILL':
                        if (values.length > 2 &&
                            ((values[0] !== 'L' && shapeDataObject.radiiR.length > 0) ||
                                (values[0] !== 'R' && shapeDataObject.radiiL.length > 0))) {
                            dpr = new Drillhole(shapeDataObject);
                            minus4Left = (values[0] === 'L') ? -1.0 : 1.0;
                            dpr.FaceSide(values[0]);
                            dpr.XStart(parseFloat(values[1]) * minus4Left);
                            dpr.YStart(parseFloat(values[2]));
                            if (values.length > 3) dpr.Diameter(parseFloat(values[3]));
                            if (values.length > 4) dpr.XEnd(parseFloat(values[4]) * minus4Left);
                            if (values.length > 5) dpr.YEnd(parseFloat(values[5]));
                            if (values.length > 6) dpr.Depth(parseFloat(values[6]));
                            if (values.length > 7) dpr.AngleMode(values[7]);
                            if (values.length > 8) dpr.LateralAngle(parseFloat(values[8]));
                            if (values.length > 9) dpr.VerticalAngle(parseFloat(values[9]));
                            shapeDataObject.Drillholes.push(dpr);
                        }
                        break;
                    case 'DRILLE':
                        drilleRecords.push(values);
                        break;
                    case 'FTYP': // 0– Undefined, 1 – Plastic, 2 – Metal, 3 – Rimless, 4 – Optyl/Nylor, 6 - Pattern
                        shapeDataObject.frameType(parseInt(values[0]));
                        break;
                    case 'DBL':
                        shapeDataObject.dbl(parseFloat(values[0]));
                        shapeDataObject.originalDBox = parseFloat(values[0]);
                        break;
                    case '_ACTIVETID':
                        shapeDataObject.tracerID(parseInt(values[0]));
                        break;
                    case 'HBOX':
                        if (values[0] !== '' && values[0] !== '?' && (values[1] == '' || values[1] == '?') && shapeDataObject.activeSide !== 'B') {
                            shapeDataObject.hboxR(parseFloat(values[0]));
                            shapeDataObject.originalHBoxR = parseFloat(values[0]);
                            shapeDataObject.originalHBox = parseFloat(values[0]);
                        } else if (values[1] !== '' && values[1] !== '?' && (values[0] == '' || values[0] == '?') && shapeDataObject.activeSide !== 'B') {
                            shapeDataObject.hboxL(parseFloat(values[1]));
                            shapeDataObject.originalHBoxL = parseFloat(values[1]);
                            shapeDataObject.originalHBox = parseFloat(values[1]);
                        } else if ((values[0] !== '' && values[0] !== '?' && values[1] !== '' && values[1] !== '?') || shapeDataObject.activeSide == 'B') {
                            shapeDataObject.hboxR((shapeDataObject.activeSide == 'B' && isNaN(parseFloat(values[0]))) ? parseFloat(values[1]) : parseFloat(values[0]));
                            shapeDataObject.originalHBoxR = shapeDataObject.hboxR();
                            shapeDataObject.hboxL((shapeDataObject.activeSide == 'B' && isNaN(parseFloat(values[1]))) ? parseFloat(values[0]) : parseFloat(values[1]));
                            shapeDataObject.originalHBoxL = shapeDataObject.hboxL();
                            if (shapeDataObject.originalHBox === '') {
                                shapeDataObject.originalHBox = shapeDataObject.originalHBoxR === 0.0 || shapeDataObject.originalHBoxL === 0.0
                                    ? Math.max(shapeDataObject.originalHBoxR, shapeDataObject.originalHBoxL)
                                    : parseFloat((
                                        shapeDataObject.originalHBoxR + shapeDataObject.originalHBoxL) /
                                        2).toFixed(2);
                            }
                        };
                        break;
                    case 'VBOX':
                        if (values[0] !== '' && values[0] !== '?' && (values[1] == '' || values[1] == '?') && shapeDataObject.activeSide !== 'B') {
                            shapeDataObject.vboxR(parseFloat(values[0]));
                            shapeDataObject.originalVBoxR = parseFloat(values[0]);
                            shapeDataObject.originalVBox = parseFloat(values[0]);
                        } else if (values[1] !== '' && values[1] !== '?' && (values[0] == '' || values[0] == '?') && shapeDataObject.activeSide !== 'B') {
                            shapeDataObject.vboxL(parseFloat(values[1]));
                            shapeDataObject.originalVBoxL = parseFloat(values[1]);
                            shapeDataObject.originalVBox = parseFloat(values[1]);
                        } else if ((values[0] !== '' && values[0] !== '?' && values[1] !== '' && values[1] !== '?') || shapeDataObject.activeSide == 'B') {
                            shapeDataObject.vboxR((shapeDataObject.activeSide == 'B' && isNaN(parseFloat(values[0]))) ? parseFloat(values[1]) : parseFloat(values[0]));
                            shapeDataObject.originalVBoxR = shapeDataObject.vboxR();
                            shapeDataObject.vboxL((shapeDataObject.activeSide == 'B' && isNaN(parseFloat(values[1]))) ? parseFloat(values[0]) : parseFloat(values[1]));
                            shapeDataObject.originalVBoxL = shapeDataObject.vboxL();
                            if (shapeDataObject.originalVBox === '') {
                                shapeDataObject.originalVBox = shapeDataObject.originalVBoxR === 0.0 || shapeDataObject.originalVBoxL === 0.0
                                    ? Math.max(shapeDataObject.originalVBoxR, shapeDataObject.originalVBoxL)
                                    : parseFloat((
                                        shapeDataObject.originalVBoxR + shapeDataObject.originalVBoxL) / 2).toFixed(2);
                            }
                        };
                        break;
                    case 'CIRC':
                        shapeDataObject.circR(parseFloat(values[0]));
                        shapeDataObject.circL((shapeDataObject.activeSide == 'B' && isNaN(parseFloat(values[1]))) ? shapeDataObject.circR() : parseFloat(values[1]));
                        break;
                    case 'FCRV':
                        shapeDataObject.fcrvR(parseFloat(values[0]));
                        shapeDataObject.fcrvL(parseFloat(values[1]));
                        break;
                    case 'ZTILT':
                        shapeDataObject.ztiltR(parseFloat(values[0]));
                        shapeDataObject.ztiltL(parseFloat(values[1]));
                        break;
                    case 'BEVP':
                        switch (values[0]) {
                            case '0':
                                shapeDataObject.bevelMode(-1);
                                break;
                            case '7':
                                shapeDataObject.bevelMode(0);
                                break;
                            case '4':
                                shapeDataObject.bevelMode(1);
                                break;
                            case '2':
                                shapeDataObject.bevelMode(2);
                                break;
                            case '1':
                                shapeDataObject.bevelMode(3);
                                break;
                        }
                        break;
                    case 'POLISH':
                        if (values[0] > '0')
                            shapeDataObject.polish(true);
                        break;
                    case '_TRCSIDE':
                        switch (values[0]) {
                            case 'R':
                                shapeDataObject.sides(0);
                                break;
                            case 'L':
                                shapeDataObject.sides(1);
                                break;
                            case 'B':
                                shapeDataObject.sides(2);
                                break;
                            default:
                                shapeDataObject.sides(-1);
                                break;
                        }
                        break;
                    case '_CALIBRATIONDATE':
                        var currentDate = new Date();
                        var calibrationDate = new Date(); // YYYYMMDDhhmmss
                        calibrationDate.setFullYear(values[0].substr(0, 4),
                            0 + values[0].substr(4, 2) - 1,
                            values[0].substr(6, 2));
                        calibrationDate.setHours(values[0].substr(8, 2), values[0].substr(10, 2), values[0].substr(12, 2));
                        var elapsed = (currentDate - calibrationDate) / (1000.0 * 60.0 * 60.0); // elapsed time in hours
                        shapeDataObject.isCalibrated(elapsed < 24.0);
                        break;
                    case '_FCLASS':
                        shapeDataObject.fClass = parts[1];
                        break;
                }
            }
        }
    }

    shapeDataObject.activeSide = setActiveSide(shapeDataObject);

    if (shapeDataObject.activeSide === 'B' && (isNaN(shapeDataObject.ztiltR()) || isNaN(shapeDataObject.ztiltL()))) {
        CopyNaNZTILT(shapeDataObject);
    }

    if (shapeDataObject.originalHBox == 0 || shapeDataObject.originalVBox == 0) {
        shapeDataObject.CalculateXYnBOX(true);
    } else {
        shapeDataObject.CalculateXYnBOX(false);
    }

    // now handle the DRILLE records while the shape data is present...
    for (var z = 0; z < drilleRecords.length; z++) {
        values = drilleRecords[z];
        if (values.length > 2 && ((values[0] !== 'L' && shapeDataObject.radiiR.length > 0) || (values[0] !== 'R' && shapeDataObject.radiiL.length > 0))) {
            dpr = new Drillhole(shapeDataObject);
            //Looking for origin and reference
            if (values[1].split('')[0] !== 'E' && values[1].split('')[0] !== 'B') {
                dpr.XOrigin('C');
                dpr.XReference('C');
            } else {
                dpr.XOrigin(values[1].split('')[0]);
                dpr.XReference(values[1].split('')[1]);
            }
            minus4Left = (values[0] === 'L' && dpr.XOrigin() != 'C') ? -1.0 : 1.0;
            dpr.FaceSide(values[0]);
            // XReference has different values to retrieve depending on the first character.
            dpr.MountingSide(values[1].indexOf('R') > -1 ? 'R' : 'F');
            // We must recover the YStart prior to the XStart, because the XStart may needs the YStart to calculate its referenced location
            dpr.YStart(parseFloat(values[3]));
            dpr.XStart2Show(parseFloat(values[2]) * minus4Left);


            if (values.length > 3) dpr.Diameter(parseFloat(values[4]));
            if (values.length > 4) values[5] === '' ? dpr.XEnd2Show(values[5]) : dpr.XEnd2Show(parseFloat(values[5]) * minus4Left);
            if (values.length > 5) values[6] === '' ? dpr.YEnd2Show(values[6]) : dpr.YEnd2Show(parseFloat(values[6]));
            if (values.length > 6) dpr.Depth(parseFloat(values[7]));

            if (values.length > 7) {
                dpr.HoleType(values[8]);
                dpr.AngleMode(values[9]);
            }
            if (values.length > 8) dpr.LateralAngle(parseFloat(values[10]));
            if (values.length > 9) dpr.VerticalAngle(parseFloat(values[11]));

            // Guessing the holeType if end points are different from the start ones
            if (values[5] > 0 || values[6] > 0)
                if ((values[2] !== values[5]) || (values[3] !== values[6])) {
                    dpr.HoleType(1);
                }

            if (dpr.HoleType() === 0) {
                dpr.XEnd2Show('');
                dpr.YEnd2Show('');
            }
            shapeDataObject.Drillholes.push(dpr);

            /*ORIGINAL GENERATION*/
            var dprOrig = new Drillhole(shapeDataObject);

            //Looking for origin and reference
            if (values[1].split('')[0] !== 'E' && values[1].split('')[0] !== 'B') {
                dprOrig.XOrigin('C');
                dprOrig.XReference('C');
            } else {
                dprOrig.XOrigin(values[1].split('')[0]);
                dprOrig.XReference(values[1].split('')[1]);
            }

            minus4Left = (values[0] === 'L' && dprOrig.XOrigin() != 'C') ? -1.0 : 1.0;
            dprOrig.FaceSide(values[0]);
            // dpr.XReference(values[1]);
            // XReference has different values to retrieve depending on the first character.
            dprOrig.MountingSide(values[1].indexOf('R') > -1 ? 'R' : 'F');


            // We must recover the YStart prior to the XStart, because the XStart may needs the YStart to calculate its referenced location
            dprOrig.YStart(parseFloat(values[3]));
            dprOrig.XStart2Show(parseFloat(values[2]) * minus4Left, false);

            if (values.length > 3) dprOrig.Diameter(parseFloat(values[4]));
            if (values.length > 4) values[5] === '' ? dprOrig.XEnd2Show(values[5]) : dprOrig.XEnd2Show(parseFloat(values[5]) * minus4Left);
            if (values.length > 5) values[6] === '' ? dprOrig.YEnd2Show(values[6]) : dprOrig.YEnd2Show(parseFloat(values[6]));
            if (values.length > 6) dprOrig.Depth(parseFloat(values[7]));

            if (values.length > 7) {
                dprOrig.AngleMode(values[9]);
            }
            if (values.length > 8) dprOrig.LateralAngle(parseFloat(values[10]));
            if (values.length > 9) dprOrig.VerticalAngle(parseFloat(values[11]));
            shapeDataObject.originalDrillHoles.push(dprOrig);
        }
    }
    return shapeDataObject;
};

function CopyNaNZTILT(shapeDataObject) {
    if (isNaN(shapeDataObject.ztiltR())) {
        shapeDataObject.ztiltR(shapeDataObject.ztiltL());
    } else {
        shapeDataObject.ztiltL(shapeDataObject.ztiltR());
    }
}

function Drillhole(shapeData) {

    var self = this;
    self.shapeData = shapeData;
    self.isOut = ko.pureComputed({
        read: function () {
            if (self.shapeData.editMode() === 4) {

                return (!Raphael.isPointInsidePath(self.shapeData.getPath(self.shapeData.viewSide),
                    self.XStart(),
                    self.YStart()));
            } else {

                return false;
            }
        }
    });
    self.pure = true;
    self.selected = false;
    self.isSelected = ko.observable(false);
    self.groupID = ko.observable('A');
    self.groupSeq = ko.observable(-1);
    self.XStart = ko.observable(0.0).extend({ numeric: 2 });    // always related to center !
    self.YStart = ko.observable(0.0).extend({ numeric: 2 });
    self.XEnd = ko.observable(0.0).extend({ numeric: 2 });      // always related to center !
    self.YEnd = ko.observable(0.0).extend({ numeric: 2 });
    self.Diameter = ko.observable(1.0).extend({ numeric: 2 });
    self.Depth = ko.observable(0.0).extend({ numeric: 2 });
    self.FaceSide = ko.observable('B');
    self.MountingSide = ko.observable('F');
    self.HoleType = ko.observable(0);
    self.AngleMode = ko.observable('F');
    self.XReference = ko.observable('C');
    self.XOrigin = ko.observable('C');
    self.LateralAngle = ko.observable(0.0).extend({ numeric: 1 });
    self.VerticalAngle = ko.observable(0.0).extend({ numeric: 1 });
    self.SortOrder = ko.observable(0);
    self.Surface = ko.observable('A');
    self.XStart2Show = ko.pureComputed({
        read: function () {
            switch (self.XReference()) {
                case 'C': return self.XStart(); break;
                case 'N': return self.GetDHatX(self.YStart(), self.XStart(), 'N', self.FaceSide()).toFixed(2); break;
                case 'T': return self.GetDHatX(self.YStart(), self.XStart(), 'T', self.FaceSide()).toFixed(2); break;
            }
            return '?';
        },
        write: function (value) {
            switch (self.XReference()) {
                case 'C': self.XStart(value); break;
                case 'N': self.XStart(self.GetXatDH(self.YStart(), value, 'N', self.FaceSide())); break;
                case 'T': self.XStart(self.GetXatDH(self.YStart(), value, 'T', self.FaceSide())); break;
            };
            self.shapeData.toggleAcceptButton(!self.isOut());
        }
    });

    self.XEnd2Show = ko.pureComputed({

        read: function () {
            if (self.HoleType() == '0') {
                self.XEnd(self.XStart());
                return '';
            }
            //if (self.XStart() === self.XEnd())
            //    return "";
            else
                switch (self.XReference()) {
                    case 'C': return self.XEnd(); break;
                    case 'N': return self.GetDHatX(self.YEnd(), self.XEnd(), 'N', self.FaceSide()).toFixed(2); break;
                    case 'T': return self.GetDHatX(self.YEnd(), self.XEnd(), 'T', self.FaceSide()).toFixed(2); break;
                }
            return '?';
        },
        write: function (value) {

            if (value !== '') {
                switch (self.XReference()) {
                    case 'C':
                        self.XEnd(value);
                        break;
                    case 'N':
                        self.XEnd(self.GetXatDH(self.YEnd(), value, 'N', self.FaceSide()));
                        break;
                    case 'T':
                        self.XEnd(self.GetXatDH(self.YEnd(), value, 'T', self.FaceSide()));
                        break;
                }
            } else {
                self.HoleType() == '0' ? self.XEnd(self.XStart()) : self.XEnd(value);
            }
            self.shapeData.toggleAcceptButton(!self.isOut());
        }
    });

    self.YStart2Show = ko.pureComputed({
        read: function () {
            return self.YStart().toFixed(2);
        },
        write: function (value) {
            self.YStart(value);
            self.shapeData.toggleAcceptButton(!self.isOut());
        }
    });

    self.YEnd2Show = ko.pureComputed({

        read: function () {
            if (self.HoleType() == '0') {
                self.YEnd(self.YStart());
                return '';
            }
            else
                return self.YEnd().toFixed(2);
        },
        write: function (value) {
            if (value !== '') {
                self.YEnd(value);
            } else {
                self.YEnd(self.YStart());
            }
            self.shapeData.toggleAcceptButton(!self.isOut());
        }
        //owner: self
    });

    self.visuals = ko.pureComputed({
        read: function () {
            self.XStart();
            self.YStart();
            self.XEnd();
            self.YEnd();
            self.Diameter();
            self.isSelected(); // list here all dependecies needed for drawing the feature
            return self; // object used to get all parameters and build the visual representation
        },
        write: function (value) {
            // this is called with an object holding the parameters which can be changed by mouse: XStart and YStart
            self.XStart(value.X);
            self.YStart(value.Y);
            self.XEnd(value.XE);
            self.YEnd(value.YE);
        }
        //owner: self
    });

    self.GetXatDH = function (y, distanceToEdge, nasalTemporal) {
        // Nasal: X = Edge - DH
        if (nasalTemporal === 'T') distanceToEdge = -distanceToEdge;
        //carbonea 19/07/2016 -- correction for left side
        if (self.FaceSide() === 'L') distanceToEdge = -distanceToEdge;
        var xEdge = shapeData.GetXatY(y, nasalTemporal, 0);
        return xEdge - distanceToEdge;
    };

    self.GetDHatX = function (y, x, nasalTemporal) {
        // Nasal: DH = Edge - X
        var xEdge = shapeData.GetXatY(y, nasalTemporal, 0); //side);
        var dh = xEdge - x;
        if (nasalTemporal === 'T') dh = -dh;
        return dh;
    };

    self.GetXatDH2 = function (y, distanceToBox, nasalTemporal, side) {
        // Nasal: X = Edge - DH
        var xEdge = ((side !== 'L') ? self.hboxR() : self.hboxL()) / 2.0 - distanceToBox;
        if (nasalTemporal === 'T') xEdge = -xEdge;
        return xEdge;
    };

    self.GetDHatX2 = function (y, x, nasalTemporal, side) {
        // Nasal: DH = Box - X
        var xBox = ((side === 0) ? self.hboxR() : self.hboxL()) / 2.0;
        if (nasalTemporal === 'T') xBox = -xBox;
        var dh = xBox - x;
        if (nasalTemporal === 1) dh = -dh;
        return dh;
    };

    return self;
}

function decode(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';

    for (var i = 0; i < hex.length; i += 2) {
        if (hex.substr(i, 1) === '\n') // the rest of the data is uncoded!
        {
            str += hex.substr(i);
            break;
        }
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16) ^ (((i / 2) + 1) % 256));
    }

    return str;
}

function decode2(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

function setActiveSide(shapeDataObject) {

    var activeSide;
    if (isValidRadiiData(shapeDataObject.radiiR) && !isValidRadiiData(shapeDataObject.radiiL)) {
        activeSide = 'R';
    } else if (!isValidRadiiData(shapeDataObject.radiiR) && isValidRadiiData(shapeDataObject.radiiL))
        activeSide = 'L';
    else
        activeSide = 'B';

    return activeSide;
}

function isValidRadiiData(radiiData) {

    return radiiData.length > 0 && !isFilledWithZeroesRadiiData(radiiData);
}

function isFilledWithZeroesRadiiData(radiiData) {

    for (var i = 0; i <= radiiData.length - 1; i++) {
        if (radiiData[i].rad !== 0) {
            return false;
        }
    }
    return true;
}

function preciseRound(num) {

    return Math.round(num * 100) / 100;
}
