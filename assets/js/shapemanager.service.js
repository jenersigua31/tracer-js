var shapeManagerService = (function ($, apiService) {
  var _frameTypesList = [];
  var _selectedFrameType = null;

  var _propertiesError = [];
  var _optionSettings = null;

  var _tool = null;

  var _localShape = {};
  var _drillEditor = null;
  var _shapeDrawer = null;

  var _shapeData = {};
  var _shapeOrigins = null;

  var _viewMode = 0;
  var _mirrorMode = false;
  var _resizeEnable = true;
  var _shapeWasModified = false;

  // TODO: need to get this on current user
  var _siteId = 70;

  var ShapeManager = function () {
    var self = this;

    Object.defineProperties(this, {
      viewMode: {
        get: function () {
          return _viewMode;
        },
      },
      abox: {
        get: function () {
          return _localShape.Abox;
        },
        set: function (value) {
          _localShape.Abox = parseFloat(value);
        },
      },
      bbox: {
        get: function () {
          return _localShape.Bbox;
        },
        set: function (value) {
          _localShape.Bbox = parseFloat(value);
        },
      },
      dbox: {
        get: function () {
          return _localShape.Dbox;
        },
        set: function (value) {
          _localShape.Dbox = parseFloat(value);
        },
      },
      minAbox: {
        get: function () {
          var value = filterOption('ShapeABoxMinimum');

          if (!value || value === '') {
            return (parseFloat(_shapeData.originalHBox) - 10).toFixed(2);
          }

          return value;
        },
      },
      maxAbox: {
        get: function () {
          var value = filterOption('ShapeABoxMaximum');

          if (!value || value === '') {
            return (parseFloat(_shapeData.originalHBox) + 20).toFixed(2);
          }

          return value;
        },
      },
      minBbox: {
        get: function () {
          var value = filterOption('ShapeBBoxMinimum');

          if (!value || value === '') {
            return (parseFloat(_shapeData.originalVBox) - 10).toFixed(2);
          }

          return value;
        },
      },
      maxBbox: {
        get: function () {
          var value = filterOption('ShapeBBoxMaximum');

          if (!value || value === '') {
            return (parseFloat(_shapeData.originalVBox) + 20).toFixed(2);
          }

          return value;
        },
      },
      minDbox: {
        get: function () {
          var value = filterOption('ShapeDblMinimum');

          if (!value || value === '') {
            return this.boxingRangesAllowed.DBL.MIN.toFixed(2);
          }

          return value;
        },
      },
      maxDbox: {
        get: function () {
          var value = filterOption('ShapeDblMaximum');

          if (!value || value === '') {
            return this.boxingRangesAllowed.DBL.MAX.toFixed(2);
          }

          return value;
        },
      },
      incrementAbox: {
        get: function () {
          return filterOption('ABoxIncrement');
        },
      },
      incrementBbox: {
        get: function () {
          return filterOption('BBoxIncrement');
        },
      },
      incrementDbox: {
        get: function () {
          return filterOption('DBLIncrement');
        },
      },
      rimlessSelected: {
        set: function (value) {
          _localShape.RimlessSelected = value;
        },
      },
      fullRimSelected: {
        set: function (value) {
          _localShape.FullRimSelected = value;
        },
      },
      shapeWasModified: {
        get: function () {
          return _shapeWasModified;
        },
        set: function (value) {
          _shapeWasModified = value;
        },
      },
      shapeQuality: {
        get: function () {
          if (_shapeData.hasData()) {
            if (_shapeData.activeSide === 'B' || _shapeData.activeSide === 'R') {
              return _shapeData.radiiR.length;
            } else {
              return _shapeData.radiiL.length;
            }
          }

          return '';
        },
      },
      isDisableHBox: {
        get: function () {
          if (_localShape.ResizeMode) {
            return !_resizeEnable || _localShape.ResizeMode === '1';
          }
          return false;
        },
      },
      selectedFrameType: {
        get: function () {
          return _selectedFrameType;
        },
        set: function (value) {
          _selectedFrameType = value;
        },
      },
      stdNumber: {
        get: function () {
          return _localShape.StdNumber;
        },
      },
      frameTypes: {
        get: function () {
          return _frameTypesList;
        },
      },
      boxingRangesAllowed: {
        get: function () {
          return {
            DBL: {
              MAX: 36,
              MIN: 1,
            },
            HBOX: {
              MAX: 100,
              MIN: 20,
            },
            VBOX: {
              MAX: 100,
              MIN: 10,
            },
          };
        },
      },
    });

    this.load = function () {
      _shapeData = new ShapeData();
      _shapeData.clear();
      var canvasDivId = 'ShapeCanvas';
      _drillEditor = new DrillEditor(_shapeData, canvasDivId, 125, false, true);

      _shapeDrawer = new ShapeDrawer();
      _shapeData.WasResized = false;

      initializeValues();
    };

    this.initializeShape = function () {
      _localShape.InitialFrameType = {};
    };

    this.loadShapeOrigins = function () {
      var $d = $.Deferred();

      apiService.getShapeOrigins(_siteId).then(function (d) {
        _shapeOrigins = d.List;
        $d.resolve();
      });

      return $d.promise();
    };

    this.getOptions = function () {
      var $d = $.Deferred();

      apiService.getSpaceOption({ accountId: 0, sectionId: 5, subSpaceId: 0 }, _siteId).then(function (d) {
        _optionSettings = _.map(d, function (values) {
          var options = {};

          _.forIn(values, function (value, key) {
            if (_.startsWith(key, '$')) {
              return;
            }
            if (_.startsWith(key, 'ow')) {
              return;
            }
            options[key] = value;
          });

          return options;
        });

        $d.resolve();
      });

      return $d.promise();
    };

    this.selectShape = function (shape) {
      console.log(shape);
      var $d = $.Deferred();
      _localShape = Object.assign({}, shape);
      _localShape.ShapeData = decode2(shape.ShapeData);

      this.initializeShape();

      _shapeData.shapeOrigin = 'STS';
      _shapeData.shapeOriginText = 'Standard ' + shape.StdNumber;
      _shapeData.sOma = _localShape.ShapeData;

      _localShape.Abox = '';
      _localShape.Bbox = '';
      _localShape.Dbox = '';
      _localShape.Source = 'STS';
      _localShape.ActiveSide = _shapeData.activeSide;

      getFrameTypes(_shapeData.Drillholes().length > 0, _shapeData.frameType(), _shapeData.fClass)
        .then(function () {
          disableSide();
          return mirrorShape(_localShape.Source, _localShape.ActiveSide, _localShape.RimlessSelected);
        })
        .then(function () {
          $d.resolve({ shapeData: _shapeData, localShape: _localShape });
        });

      return $d.promise();
    };

    this.resizeShape = function () {
      if (this.validateShapeBoxingRanges()) {
        if (!_localShape.ResizeMode) {
          _localShape.ResizeMode = 0;
        }

        var mode = parseInt(_localShape.ResizeMode);

        if (mode < 0) {
          return false;
        }

        _shapeData.ResizeShape(_localShape.Abox, _localShape.Bbox, _localShape.Dbox, mode);

        if (_shapeWasModified && isNotEqualShapeAndLocalShape()) {
          _localShape.ShapeData = _shapeData.sOma;
          _localShape.AboxR = _localShape.Abox;
          _localShape.AboxL = _localShape.Abox;
          _localShape.BboxR = _localShape.Bbox;
          _localShape.BboxL = _localShape.Bbox;
        }

        onReshape();
        return true;
      }

      return false;
    };

    this.setViewMode = function (mode, sides) {
      switch (sides) {
        case 'R':
          _drillEditor.SetMode(mode, 'R');
          break;
        case 'B':
          _drillEditor.SetMode(mode, 'B');
          break;
        case 'L':
          _drillEditor.SetMode(mode, 'L');
          break;
        default:
          break;
      }
      _shapeData.viewSide = sides;

      if (_shapeData.Drillholes().length > 0) {
        _shapeData.toggleAcceptButton(_shapeData.areAllDrillsInsideShape(_shapeData.Drillholes()));
      }
    };

    this.applyDrawChanges = function () {
      var $d = $.Deferred();
      if (
        _localShape.Abox !== _shapeData.CalculateHBOX(_shapeData.originalHBoxR, _shapeData.originalHBoxL) ||
        _localShape.Bbox !== _shapeData.CalculateHBOX(_shapeData.originalVBoxR, _shapeData.originalVBoxL) ||
        _localShape.UserHasResized
      ) {
        loadTools().then(function () {
          self.resizeShape();
          $d.resolve();
        });
      }

      return $d.promise();
    };

    this.validateShapeBoxingRanges = function () {
      _propertiesError = [];
      var valid = true;
      // VBOX and HBOX validations
      if (this.abox === undefined || this.abox > parseFloat(this.maxAbox) || this.abox < parseFloat(this.minAbox)) {
        valid = false;
      }

      if (this.bbox === undefined || this.bbox > parseFloat(this.maxBbox) || this.bbox < parseFloat(this.minBbox)) {
        valid = false;
      }

      if (
        this.dbox === undefined ||
        this.dbox > parseFloat(this.maxDbox) ||
        this.dbox < parseFloat(this.minDbox) ||
        this.dbox === '' ||
        this.dbox === null
      ) {
        valid = false;
      }

      return valid;
    };

    // #region PRIVATE
    function initializeValues() {
      _tool = {
        DRILL: {
          FullRim: false,
          Rimless: false,
        },
        MIRROR: {
          FullRim: false,
          Rimless: false,
        },
        RESIZE: {
          FullRim: false,
          Rimless: false,
        },
      };

      _frameTypesList = [];
    }

    function isHighResolution() {
      return self.shapeQuality >= 400;
    }

    function getFrameTypes(hasDrillPoints, frameType, fClass) {
      var $d = $.Deferred();

      apiService.getFrameTypes(hasDrillPoints, _localShape.Source, fClass, frameType).then(function (d) {
        _localShape.RimlessSelected = d.IsRimless;
        _localShape.FullRimSelected = !d.IsRimless;
        _frameTypesList = d.FrameTypes;
        self.shapeWasModified = false;

        $d.resolve();
      });

      return $d.promise();
    }

    function loadTools() {
      var $d = $.Deferred();

      apiService.getShapeMenuTools(_siteId).then(function (data) {
        if (data.List) {
          $(data.List).each(function (index, item) {
            if (item.ShapeToolsName !== 'RESIZEBOTTOM') {
              if (item.FrameTypeFamilyName.toUpperCase().trim() === 'RIMLESS') {
                _tool[item.ShapeToolsName].Rimless = item.FrameTypeFamilyName.toUpperCase().trim() === 'RIMLESS';
              } else if (item.FrameTypeFamilyName.toUpperCase().trim() === 'FULLRIM') {
                _tool[item.ShapeToolsName].FullRim = item.FrameTypeFamilyName.toUpperCase().trim() === 'FULLRIM';
              }
            }
          });
        }

        $d.resolve();
      });

      return $d.promise();
    }

    function mirrorShape(shapeSource, activeSide, isRimless) {
      if (_mirrorMode || !isHighResolution()) {
        if (shapeSource === 'STS' || shapeSource === 'TABLET' || (shapeSource === 'IMPRSHAPE' && IsHighResolution())) {
          mirrorSide();
          self.setViewMode(0, 'B');
        }
      }
    }

    function mirrorSide() {
      if (_shapeData.activeSide === 'R') {
        _localShape.AboxL = _localShape.AboxR;
        _localShape.BboxL = _localShape.BboxR;
      } else if (_shapeData.activeSide === 'L') {
        _localShape.AboxR = _localShape.AboxL;
        _localShape.BboxR = _localShape.BboxL;
      }

      _shapeData.ShapeDataFromSide = _shapeData.activeSide;
      _shapeData.activeSide = 'B';
      _localShape.ActiveSide = 'B';
      enableSide('L');
      enableSide('R');

      if ((!_localShape.Dbox || _localShape.Dbox === 0) && _shapeData.shapeOrigin !== 'STS') {
        _shapeData.dbl2(15);
        if (_shapeData.Dbox === 0) {
          _shapeData.dbl(15);
        }
        _drillEditor.DrawShape();
      }

      _shapeData.MirrorShape();
    }

    function onReshape() {
      _shapeData.editMode(0);

      if (_localShape.ActiveSide !== 'B') {
        _viewMode = 0;
        self.setViewMode(0, _localShape.ActiveSide);
      } else {
        _viewMode = 0;
        self.setViewMode(0, 'B');
      }
    }

    function filterOption(optionCode) {
      var value = '';
      var options = $(_optionSettings).filter(function (index, item) {
        return item.OptionCode === optionCode;
      });
      if (options.length > 0) {
        value = options[0].SettingValue;
      }

      return value;
    }

    function isNotEqualShapeAndLocalShape() {
      var two = 2;

      var toFixedRound = function (value, decimals) {
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
      };

      /**
       * Checking values this way (round with two decimals)
       * because we may recieve 53.275 (number) and "53.28" (string)
       */
      return (
        toFixedRound(_shapeData.originalHBox, two) !== toFixedRound(_localShape.Abox, two) ||
        toFixedRound(_shapeData.originalVBox, two) !== toFixedRound(_localShape.Bbox, two)
      );
    }

    function disableSide(side) {
      if (side) {
        $('#path' + side).attr('stroke', '#E8E5E4');
      } else if (_localShape.ActiveSide === 'R') {
        $('#pathL').attr('stroke', '#E8E5E4');
      } else if (_localShape.ActiveSide === 'L') {
        $('#pathR').attr('stroke', '#E8E5E4');
      } else {
        enableSide('L');
        enableSide('R');
      }
    }

    function enableSide(side) {
      $('#path' + side).attr('stroke', '#0000ff');
      $('rect[id=hole' + side + ']').attr('stroke', 'black');
    }
    // #endregion END OF PRIVATE

    $(window).resize(function () {
      if (_shapeData.viewSide) {
        self.setViewMode(self.viewMode, _shapeData.viewSide);
      }
    });
  };

  return new ShapeManager();
})(jQuery, apiService);
