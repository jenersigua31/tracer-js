var apiService = (function ($) {
  var WebApi = function () {
    var baseUrl = 'http://now-api.asia.essilor.group/api';

    this.token = '';

    this.setToken = function (token) {
      this.token = token;
    };

    this.loginParams = function (loginData) {
      var $d = $.Deferred();
      var url = baseUrl + '/login/loginParams';

      var data = {
        UserName: loginData.userName,
        Password: loginData.password,
        SitePrefix: 'OWQA#',
        URL: loginData.url,
      };

      $.post(url, data).done($d.resolve).fail($d.reject);

      return $d.promise();
    };

    this.getStandardShapes = function (id) {
      var $d = $.Deferred();

      var url = baseUrl + '/shapes/StandardShapeSet?setId=' + id;

      $.ajax({ url: url, headers: { Authorization: 'Bearer ' + this.token } })
        .done($d.resolve)
        .fail($d.reject);
      return $d.promise();
    };

    this.getFrameTypes = function (hasDrillPoints, shapeOrigin, fClass, frameType) {
      var $d = $.Deferred();

      // TODO: need to get this on current user
      var spaceId = 70;

      var url =
        baseUrl +
        '/shapes/FrameTypes?shapeOrigin=' +
        shapeOrigin +
        '&spaceId=' +
        spaceId +
        '&hasDrillPoints=' +
        hasDrillPoints +
        '&fClass=' +
        fClass +
        '&fTyp=' +
        frameType;

      $.ajax({ url: url, headers: { Authorization: 'Bearer ' + this.token } })
        .done($d.resolve)
        .fail($d.reject);
      return $d.promise();
    };

    this.getShapeOrigins = function (spaceId) {
      var $d = $.Deferred();
      var url = baseUrl + '/shapes/ShapeOriginsBySpaceId?spaceId=' + spaceId;

      $.ajax({ url: url, headers: { Authorization: 'Bearer ' + this.token } })
        .done($d.resolve)
        .fail($d.reject);
      return $d.promise();
    };

    this.getSpaceOption = function (params, siteId) {
      var $d = $.Deferred();
      var url =
        baseUrl +
        '/accounts/options?id=' +
        params.accountId +
        '&accountId=' +
        params.accountId +
        '&sectionId=' +
        params.sectionId +
        '&subSpaceId=' +
        params.subSpaceId;

      $.ajax({ url: url, cache: true, headers: { Authorization: 'Bearer ' + this.token, SiteId: siteId } })
        .done($d.resolve)
        .fail($d.reject);
      return $d.promise();
    };

    this.getShapeMenuTools = function (siteId) {
      var $d = $.Deferred();
      var url = baseUrl + '/shapes/ShapeToolsBySpaceId?spaceId=' + siteId;

      $.ajax({ url: url, cache: true, headers: { Authorization: 'Bearer ' + this.token } })
        .done($d.resolve)
        .fail($.reject);

      return $d.promise();
    };
  };

  return new WebApi();
})(jQuery);
