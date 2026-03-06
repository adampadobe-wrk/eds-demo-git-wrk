/**
 * Adobe Web SDK base code (stub) - creates window.alloy queue before alloy.min.js loads.
 * Uses setTimeout variant from Adobe docs to avoid }} syntax issues.
 */
!function(n,o){o.forEach(function(o){n[o]||((n.__alloyNS=n.__alloyNS||[]).push(o),n[o]=function(){var u=arguments;return new Promise(function(i,l){n.setTimeout(function(){n[o].q.push([i,l,u])})})},n[o].q=[])})}(window,["alloy"]);
