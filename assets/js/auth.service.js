var authService = (function ($, apiService) {
  var PKI_PUBLIC_KEY =
    '-----BEGIN PUBLIC KEY-----' +
    'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAphHIqGR3GCSgxjgMpOKF' +
    'dY2V11DyayQVnB1lWInTRKcxfQq2WQqbZEiOVq/wcVtqV13IpIP5Dnns4R1XLxrZ' +
    '0dP5DWxgpaAYJAzpd6xTzp2bsjxIq4Q9eqynujI/agw2LfnXOHt9Oym+QZ0HsgMs' +
    'WjM9orDKx2S32RK0D6rqp6+tRDwD5t9EBLPf+DU/nQGp2NmMvGP339sMG4o5MGEc' +
    'A/YTnlWxqLz1XwOsuSbv+WUsUvZLCFLMWHFVMFXbV/K56vn92n3tRcdZdPsq25kc' +
    'FByN0uE0SD7aX2nbMgoW1iM8kcH0SxfMDrO0YGVBhW+m2nOdtKLAQcaQBlck9Bsu' +
    '0QIDAQAB' +
    '-----END PUBLIC KEY-----';

  var baseUri = '//now-api.asia.essilor.group/';

  var AuthService = function () {
    var userName = 'opticiantest';
    var password = '123456';

    this.authenticate = function () {
      var $d = $.Deferred();
      var loginData = {
        userName: userName,
        password: encrypt(password),
        url: '/partners/qatestsite/',
      };

      apiService
        .loginParams(loginData)
        .then(function (d) {
          // console.log(d);
          return createSession(loginData, d);
        })
        .then($d.resolve)
        .fail($d.reject);

      return $d.promise();
    };

    function createSession(loginData, userLogged) {
      var $d = $.Deferred();
      var data = 'grant_type=password&username=' + userLogged.UserName + '&password=' + encodeURIComponent(loginData.password);

      $.post(baseUri + 'Token', data)
        .done($d.resolve)
        .fail($d.reject);

      return $d.promise();
    }

    function encrypt(text) {
      var rsaEncrypt = new JSEncrypt();
      rsaEncrypt.setPublicKey(PKI_PUBLIC_KEY);

      return rsaEncrypt.encrypt(text);
    }
  };

  return new AuthService();
})(jQuery, apiService);
