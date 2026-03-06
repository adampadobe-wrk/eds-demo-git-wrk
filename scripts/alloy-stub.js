/**
 * Adobe Web SDK base code (stub) - creates window.alloy queue before alloy.min.js loads.
 * Built at runtime to avoid EDS template processing of }} and similar patterns.
 */
(function(){
  var c=String.fromCharCode(125);
  var s='(function(n,o){o.forEach(function(x){n[x]||((n.__alloyNS=n.__alloyNS||[]).push(x),n[x]=function(){var u=arguments;return new Promise(function(r,j){n[x].q=n[x].q||[],n[x].q.push([u,r,j])'+c+')'+c+'},n[x].q=[])});})(window,["alloy"])';
  eval(s);
})();
