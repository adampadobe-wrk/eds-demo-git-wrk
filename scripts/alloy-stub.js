/**
 * Adobe Web SDK base code (stub) - creates window.alloy queue before alloy.min.js loads.
 * Required for alloy to work. See: https://experienceleague.adobe.com/docs/experience-platform/web-sdk/install/library
 */
(function(n,o){o.forEach(function(x){n[x]||((n.__alloyNS=n.__alloyNS||[]).push(x),n[x]=function(){var u=arguments;return new Promise(function(r,j){n[x].q=n[x].q||[],n[x].q.push([u,r,j])}\x7d)},n[x].q=[])});})(window,["alloy"]);
