const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src/components');

// Функция для обновления импортов в файле
function updateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const updatedContent = content.replace(
    /from ["']\.\.\/\.\.\/lib\/utils["']/g,
    'from "../lib/utils"'
  );
  
  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Updated imports in ${path.basename(filePath)}`);
  }
}

// Рекурсивно обходим директорию с компонентами
function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      updateImports(filePath);
    }
  });
}

// Запускаем обновление
console.log('Updating imports...');
processDirectory(componentsDir);
console.log('Done!');
