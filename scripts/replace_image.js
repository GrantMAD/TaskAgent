const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes("from 'react-native'") && content.includes('Image')) {
      
      let originalContent = content;
      
      // We look for 'Image' in the destructured import from 'react-native'
      // Example: import { View, Text, Image, StyleSheet } from 'react-native';
      const importRegex = /(import\s+\{.*)\bImage\b(.*\s+from\s+['"]react-native['"];?)/g;
      
      if (importRegex.test(content)) {
          // Replace Image, 
          let newContent = content.replace(/(import\s+\{[^{}]*?)\s*,\s*Image\b([^{}]*\}\s+from\s+['"]react-native['"];?)/g, "$1$2");
          // Replace Image (at the start)
          newContent = newContent.replace(/(import\s+\{\s*)Image\b\s*,\s*([^{}]*\}\s+from\s+['"]react-native['"];?)/g, "$1$2");
          // Replace Image (only item)
          newContent = newContent.replace(/import\s+\{\s*Image\s*\}\s+from\s+['"]react-native['"];?\n?/g, "");
          
          if (newContent !== originalContent) {
               // Append expo-image import after the react-native import
               newContent = newContent.replace(/(import\s+\{[^{}]*\}\s+from\s+['"]react-native['"];?)/, "$1\nimport { Image } from 'expo-image';");
               
               // If there was no other import left from react-native (e.g. only Image was imported in that line, but we wiped it)
               if (!newContent.includes("from 'expo-image'")) {
                   // Fallback insertion at the top
                   newContent = "import { Image } from 'expo-image';\n" + newContent;
               }

               fs.writeFileSync(filePath, newContent);
               console.log('Updated: ' + filePath);
          }
      }
    }
  }
});
