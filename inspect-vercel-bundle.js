const fetch = require('node-fetch');

async function inspectVercelSite() {
    console.log('🔍 Inspecting Vercel Site JavaScript Bundle...\n');
    
    try {
        // Fetch the main HTML page
        const response = await fetch('https://order-over-view-frontend-git-main-soumitras-projects-cad3dd70.vercel.app');
        const html = await response.text();
        
        // Extract JavaScript bundle URLs
        const scriptMatches = html.match(/<script[^>]*src="([^"]*)"[^>]*>/g);
        
        if (scriptMatches) {
            console.log('📦 Found JavaScript bundles:');
            for (const match of scriptMatches) {
                const srcMatch = match.match(/src="([^"]*)"/);
                if (srcMatch && srcMatch[1]) {
                    const src = srcMatch[1];
                    if (src.includes('/assets/') && src.includes('.js')) {
                        console.log(`  - ${src}`);
                        
                        // Fetch and analyze the bundle
                        const bundleUrl = src.startsWith('http') ? src : `https://order-over-view-frontend-git-main-soumitras-projects-cad3dd70.vercel.app${src}`;
                        
                        try {
                            const bundleResponse = await fetch(bundleUrl);
                            const bundleContent = await bundleResponse.text();
                            
                            // Search for environment variable patterns
                            const envPatterns = [
                                /VITE_WEBSOCKET_URL['"]*:?\s*['"]*([^'"]+)['"]/g,
                                /VITE_API_URL['"]*:?\s*['"]*([^'"]+)['"]/g,
                                /ws:\/\/localhost:3001/g,
                                /wss:\/\/orderoverview-dkro\.onrender\.com/g,
                                /localhost:3001/g
                            ];
                            
                            console.log(`\n🔍 Analyzing bundle: ${src}`);
                            
                            for (const pattern of envPatterns) {
                                const matches = bundleContent.match(pattern);
                                if (matches) {
                                    console.log(`  Found: ${matches.slice(0, 3).join(', ')}${matches.length > 3 ? ` (and ${matches.length - 3} more)` : ''}`);
                                }
                            }
                            
                            // Check for hardcoded localhost references
                            if (bundleContent.includes('localhost:3001')) {
                                console.log('  🚨 FOUND: localhost:3001 references in bundle!');
                            }
                            
                            if (bundleContent.includes('wss://orderoverview-dkro.onrender.com')) {
                                console.log('  ✅ FOUND: Correct production WebSocket URL in bundle');
                            }
                            
                        } catch (bundleError) {
                            console.log(`  ❌ Failed to fetch bundle: ${bundleError.message}`);
                        }
                    }
                }
            }
        }
        
        // Also check for inline scripts
        const inlineScriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
        if (inlineScriptMatches) {
            console.log('\n🔍 Checking inline scripts...');
            for (const script of inlineScriptMatches) {
                if (script.includes('VITE_') || script.includes('localhost') || script.includes('orderoverview')) {
                    console.log('  Found relevant inline script content');
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error inspecting site:', error.message);
    }
}

inspectVercelSite().catch(console.error);
