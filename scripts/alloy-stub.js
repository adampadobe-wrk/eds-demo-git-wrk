/**
 * Adobe Web SDK base code (stub) - creates window.alloy queue before alloy.min.js loads.
 * Required for alloy to work. See: https://experienceleague.adobe.com/docs/experience-platform/web-sdk/install/library
 */
(function(n,o){o.forEach(function(o){n[o]||((n.__alloyNS=n.__alloyNS||[]).push(o),n[o]=function(){var u=arguments;return new Promise(function(i,l){n[o].q=n[o].q||[],n[o].q.push([u,i,l])})}})})(window,["alloy"]);
