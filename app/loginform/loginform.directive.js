(function() {
  
  'use strict';
  
  angular
    .module('app')
    .directive('loginform', loginform);
    
  function loginform() {
    return {
      templateUrl: 'app/loginform/loginform.html',
      controller: loginformController,
      controllerAs: 'vm'
    }
  }

  loginformController.$inject = ['authService'];
    
  function loginformController(authService) {
    var vm = this;
    vm.auth = authService;
  }
  
})();