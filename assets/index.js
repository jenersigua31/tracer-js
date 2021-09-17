(function ($, apiService, authService, sm) {
  var me = this;
  var $standard = $('#standard');

  var $shapeR = $('#btnShapeRight');
  var $shapeL = $('#btnShapeLeft');
  var $shapeB = $('#btnShapeBoth');

  var $hbox = $('#hboxEdit');
  var $vbox = $('#vboxEdit');
  var $dbl = $('#dblEdit');
  var $frameSelect = $('#frameTypeSelect');

  var _stdShapes = [];

  me.selectShape = function (e, shapeIndex) {
    e = e || window.event;
    e.preventDefault();
    e.stopImmediatePropagation();

    var shape = _stdShapes[shapeIndex];

    if (shape) sm.selectShape(shape).then(onShapeSelected);
  };

  me.propertyChanged = function (property) {
    sm.shapeWasModified = true;

    if (sm.validateShapeBoxingRanges()) {
      sm.applyDrawChanges().then(function () {
        if (sm.viewMode === 0) {
          $shapeB.trigger('click');
        }
      });
    }
  };

  function init() {
    sm.load();

    authService.authenticate().then(function (d) {
      apiService.setToken(d['access_token']);
      $.when(sm.getOptions(), sm.loadShapeOrigins()).then(function () {
        loadStandardShapes();
      });

      $standard.on('click', function () {
        $(this).toggleClass('nav__item--active');
      });
    });

    var setMode = function (e, m) {
      $('.view-menu__item').removeClass('selected');
      $(e).addClass('selected');
      sm.setViewMode(-1, m);
    };

    $shapeR.on('click', function () {
      setMode(this, 'R');
    });

    $shapeL.on('click', function () {
      setMode(this, 'L');
    });

    $shapeB.on('click', function () {
      setMode(this, 'B');
    });

    $hbox.on('change', function () {
      sm.shapeWasModified = true;
      sm.abox = this.value;

      if (this.value > 0) {
        $('.hbox label').text('HBOX = ' + this.value);
        $('.hbox').show();
      }
    });

    $vbox.on('change', function () {
      sm.shapeWasModified = true;
      sm.bbox = this.value;

      if (this.value > 0) {
        $('.vbox label').text('VBOX = ' + this.value);
        $('.vbox').show();
      }
    });

    $dbl.on('change', function () {
      sm.shapeWasModified = true;
      sm.dbox = this.value;

      if (this.value > 0) {
        $('.dbox label').text('DBL = ' + this.value);
        $('.dbox').show();
      }
    });

    $frameSelect.on('change', function () {
      sm.selectedFrameType = sm.frameTypes[$frameSelect.prop('selectedIndex') - 1];

      if (sm.selectedFrameType.hasOwnProperty('IsRimless')) {
        propertyChanged('fType');
        sm.rimlessSelected = sm.selectedFrameType.IsRimless;
        sm.fullRimSelected = !sm.selectedFrameType.IsRimless;
      }
    });
  }

  function loadStandardShapes() {
    apiService
      .getStandardShapes(1)
      .then(function (data) {
        _stdShapes = (data || {}).List || [];

        $.each(_stdShapes, function (i, data) {
          var imgUrl = 'assets/images/shapemanager/shapes/stdShape' + data.StdNumber + '.png';

          var $shapeItem = $(
            '<li onclick="javascript:selectShape(event, ' + i + ')"><div class="lens-shape__image"><img src="' + imgUrl + '"/></div></li>'
          );
          $('#standard-shapes').append($shapeItem);

          $('.loading').hide();
        });
      })
      .fail(function (e) {
        console.log(e);
      });
  }

  function onShapeSelected(data) {
    var shapeData = data.shapeData;
    var localShape = data.localShape;

    var $editMenu = $('#view-menu');
    $standard.toggleClass('nav__item--active');

    if (shapeData.editMode() === 0) {
      $editMenu.show();
    }

    var $shapeEditItem = $editMenu.find('.need-data');
    $shapeEditItem.hide();

    if (shapeData.hasData()) {
      $shapeEditItem.show();
      $('#shape-editor').show();
      $('#shape-info').show();
      $('#std-number').text(sm.stdNumber);
      $('#shape-quality').text(sm.shapeQuality);
    }

    $shapeR.hide();
    $shapeL.hide();

    if (localShape.ActiveSide === 'B') {
      $shapeR.show();
      $shapeL.show();
    } else if (localShape.ActiveSide === 'R') {
      $shapeR.show();
    } else if (localShape.ActiveSide === 'L') {
      $shapeL.show();
    }

    if (!sm.isDisableHBox) {
      $('#hbox').show();
    }

    $hbox.val('');
    $vbox.val('');
    $dbl.val('');

    $hbox.prop('min', sm.minAbox);
    $hbox.prop('step', sm.incrementAbox);
    $vbox.prop('min', sm.minBbox);
    $vbox.prop('max', sm.maxBbox);
    $vbox.prop('step', sm.incrementBbox);
    $dbl.prop('min', sm.minDbox);
    $dbl.prop('max', sm.maxDbox);
    $dbl.prop('step', sm.incrementDbox);

    $frameSelect.empty();
    $frameSelect.append('<option value="?" selected></option>');

    $.each(sm.frameTypes, function (i, item) {
      var $frameOpt = $('<option>' + item.Description + '</option>');
      $frameSelect.append($frameOpt);
    });
  }

  init();
})(jQuery, apiService, authService, shapeManagerService);
