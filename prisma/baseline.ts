import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const migrationsDir = join(__dirname, 'migrations');

async function main() {
  try {
    const items = readdirSync(migrationsDir);
    const dirs = items.filter((item) => statSync(join(migrationsDir, item)).isDirectory());

    console.log(`\n📌 Encontradas ${dirs.length} migraciones en prisma/migrations:`);
    dirs.forEach(d => console.log(`   - ${d}`));
    console.log('\n⏳ Iniciando proceso de baselining (marcando como aplicadas)...\n');

    for (const migration of dirs) {
      console.log(`➡️ Marcar como aplicada: ${migration}`);
      try {
        execSync(`npx prisma migrate resolve --applied "${migration}"`, {
          stdio: 'inherit',
        });
      } catch (err) {
        console.warn(`⚠️ Precaución con ${migration}: Podría estar marcada previamente o requerir verificación.\n`);
      }
    }

    console.log('\n✅ ¡Baselining finalizado con éxito!');
    console.log('Ahora tu base de datos reconoce el historial de migraciones y los siguientes despliegues funcionarán normalmente.\n');
  } catch (error) {
    console.error('❌ Error durante el baselining:', error);
    process.exit(1);
  }
}

main();
