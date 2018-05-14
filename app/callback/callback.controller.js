(function () {

  'use strict';

  angular
    .module('app')
    .controller('CallbackController', ['$rootScope', callbackController]);

  function callbackController($rootScope) {
    console.log('Callback')
    $rootScope.$emit('isLogged', "Successfully logged");
  }

})();