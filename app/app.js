(function () {

  'use strict';

  angular
    .module('app', ['auth0.auth0', 'ui.router', 'ngMaterial', 'ngMessages'])
    .config(config);

  config.$inject = [
    '$stateProvider',
    '$locationProvider',
    '$urlRouterProvider',
    'angularAuth0Provider',
    '$mdIconProvider'
  ];

  function config(
    $stateProvider,
    $locationProvider,
    $urlRouterProvider,
    angularAuth0Provider,
    $mdIconProvider
  ) {
    
    $stateProvider
      .state('home', {
        url: '/',
        controller: 'HomeController',
        templateUrl: 'app/home/home.html',
        controllerAs: 'vm'
      })
      .state('callback', {
        url: '/callback',
        controller: 'CallbackController',
        templateUrl: 'app/callback/callback.html',
        controllerAs: 'vm'
      })
      .state('test', {
        url: '/test',
        template: '<h1>testing</h1>'
      });

    angularAuth0Provider.init({
      clientID: AUTH0_CLIENT_ID,
      domain: AUTH0_DOMAIN,
      responseType: 'token id_token',
      audience: 'https://' + AUTH0_DOMAIN + '/userinfo',
      redirectUri: AUTH0_CALLBACK_URL,
      scope: 'openid profile'
    });

    $urlRouterProvider.otherwise('/');

    $locationProvider.hashPrefix('');

  }

})();
