import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const officialUniversities = [
  {
    nombre: "Escuela Politécnica Nacional",
    siglas: "EPN",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.epn.edu.ec"
  },
  {
    nombre: "Escuela Superior Politécnica Agropecuaria de Manabí Manuel Félix López",
    siglas: "ESPAM",
    tipo: "UNIVERSIDAD",
    provincia: "Manabí",
    ciudad: "Calceta",
    sitioWeb: "https://www.espam.edu.ec"
  },
  {
    nombre: "Escuela Superior Politécnica de Chimborazo",
    siglas: "ESPOCH",
    tipo: "UNIVERSIDAD",
    provincia: "Chimborazo",
    ciudad: "Riobamba",
    sitioWeb: "https://www.espoch.edu.ec"
  },
  {
    nombre: "Escuela Superior Politécnica del Litoral",
    siglas: "ESPOL",
    tipo: "UNIVERSIDAD",
    provincia: "Guayas",
    ciudad: "Guayaquil",
    sitioWeb: "https://www.espol.edu.ec"
  },
  {
    nombre: "Universidad Agraria del Ecuador",
    siglas: "UAGRARIA",
    tipo: "UNIVERSIDAD",
    provincia: "Guayas",
    ciudad: "Guayaquil",
    sitioWeb: "https://www.uagraria.edu.ec"
  },
  {
    nombre: "Universidad Central del Ecuador",
    siglas: "UCE",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.uce.edu.ec"
  },
  {
    nombre: "Universidad de Cuenca",
    siglas: "UCUENCA",
    tipo: "UNIVERSIDAD",
    provincia: "Azuay",
    ciudad: "Cuenca",
    sitioWeb: "https://www.ucuenca.edu.ec"
  },
  {
    nombre: "Universidad de las Fuerzas Armadas",
    siglas: "ESPE",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Sangolquí",
    sitioWeb: "https://www.espe.edu.ec"
  },
  {
    nombre: "Universidad de Guayaquil",
    siglas: "UG",
    tipo: "UNIVERSIDAD",
    provincia: "Guayas",
    ciudad: "Guayaquil",
    sitioWeb: "https://www.ug.edu.ec"
  },
  {
    nombre: "Universidad Estatal Amazónica",
    siglas: "UEA",
    tipo: "UNIVERSIDAD",
    provincia: "Pastaza",
    ciudad: "Puyo",
    sitioWeb: "https://www.uea.edu.ec"
  },
  {
    nombre: "Universidad Estatal de Bolívar",
    siglas: "UEB",
    tipo: "UNIVERSIDAD",
    provincia: "Bolívar",
    ciudad: "Guaranda",
    sitioWeb: "https://www.ueb.edu.ec"
  },
  {
    nombre: "Universidad Estatal de Milagro",
    siglas: "UNEMI",
    tipo: "UNIVERSIDAD",
    provincia: "Guayas",
    ciudad: "Milagro",
    sitioWeb: "https://www.unemi.edu.ec"
  },
  {
    nombre: "Universidad Estatal del Sur de Manabí",
    siglas: "UNESUM",
    tipo: "UNIVERSIDAD",
    provincia: "Manabí",
    ciudad: "Jipijapa",
    sitioWeb: "https://www.unesum.edu.ec"
  },
  {
    nombre: "Universidad Estatal Península de Santa Elena",
    siglas: "UPSE",
    tipo: "UNIVERSIDAD",
    provincia: "Santa Elena",
    ciudad: "La Libertad",
    sitioWeb: "https://www.upse.edu.ec"
  },
  {
    nombre: "Universidad Laica Eloy Alfaro de Manabí",
    siglas: "ULEAM",
    tipo: "UNIVERSIDAD",
    provincia: "Manabí",
    ciudad: "Manta",
    sitioWeb: "https://www.uleam.edu.ec"
  },
  {
    nombre: "Universidad Nacional de Chimborazo",
    siglas: "UNACH",
    tipo: "UNIVERSIDAD",
    provincia: "Chimborazo",
    ciudad: "Riobamba",
    sitioWeb: "https://www.unach.edu.ec"
  },
  {
    nombre: "Universidad Nacional de Loja",
    siglas: "UNL",
    tipo: "UNIVERSIDAD",
    provincia: "Loja",
    ciudad: "Loja",
    sitioWeb: "https://www.unl.edu.ec"
  },
  {
    nombre: "Universidad Politécnica Estatal del Carchi",
    siglas: "UPEC",
    tipo: "UNIVERSIDAD",
    provincia: "Carchi",
    ciudad: "Tulcán",
    sitioWeb: "https://www.upec.edu.ec"
  },
  {
    nombre: "Universidad Técnica de Ambato",
    siglas: "UTA",
    tipo: "UNIVERSIDAD",
    provincia: "Tungurahua",
    ciudad: "Ambato",
    sitioWeb: "https://www.uta.edu.ec"
  },
  {
    nombre: "Universidad Técnica de Babahoyo",
    siglas: "UTB",
    tipo: "UNIVERSIDAD",
    provincia: "Los Ríos",
    ciudad: "Babahoyo",
    sitioWeb: "https://www.utb.edu.ec"
  },
  {
    nombre: "Universidad Técnica de Cotopaxi",
    siglas: "UTC",
    tipo: "UNIVERSIDAD",
    provincia: "Cotopaxi",
    ciudad: "Latacunga",
    sitioWeb: "https://www.utc.edu.ec"
  },
  {
    nombre: "Universidad Técnica de Machala",
    siglas: "UTMACH",
    tipo: "UNIVERSIDAD",
    provincia: "El Oro",
    ciudad: "Machala",
    sitioWeb: "https://www.utmach.edu.ec"
  },
  {
    nombre: "Universidad Técnica de Manabí",
    siglas: "UTM",
    tipo: "UNIVERSIDAD",
    provincia: "Manabí",
    ciudad: "Portoviejo",
    sitioWeb: "https://www.utm.edu.ec"
  },
  {
    nombre: "Universidad Técnica del Norte",
    siglas: "UTN",
    tipo: "UNIVERSIDAD",
    provincia: "Imbabura",
    ciudad: "Ibarra",
    sitioWeb: "https://www.utn.edu.ec"
  },
  {
    nombre: "Universidad Técnica Estatal de Quevedo",
    siglas: "UTEQ",
    tipo: "UNIVERSIDAD",
    provincia: "Los Ríos",
    ciudad: "Quevedo",
    sitioWeb: "https://www.uteq.edu.ec"
  },
  {
    nombre: "Universidad Técnica Luis Vargas Torres de Esmeraldas",
    siglas: "UTELVT",
    tipo: "UNIVERSIDAD",
    provincia: "Esmeraldas",
    ciudad: "Esmeraldas",
    sitioWeb: "https://www.utelvt.edu.ec"
  },
  {
    nombre: "Universidad de las Artes",
    siglas: "UARTES",
    tipo: "UNIVERSIDAD",
    provincia: "Guayas",
    ciudad: "Guayaquil",
    sitioWeb: "https://www.uartes.edu.ec"
  },
  {
    nombre: "Universidad Nacional de Educación",
    siglas: "UNAE",
    tipo: "UNIVERSIDAD",
    provincia: "Cañar",
    ciudad: "Azogues",
    sitioWeb: "https://www.unae.edu.ec"
  },
  {
    nombre: "Universidad Regional Amazónica",
    siglas: "IKIAM",
    tipo: "UNIVERSIDAD",
    provincia: "Napo",
    ciudad: "Tena",
    sitioWeb: "https://www.ikiam.edu.ec"
  },
  {
    nombre: "Universidad de Investigación de Tecnología Experimental Yachay",
    siglas: "YACHAY TECH",
    tipo: "UNIVERSIDAD",
    provincia: "Imbabura",
    ciudad: "Urcuquí",
    sitioWeb: "https://www.yachaytech.edu.ec"
  },
  {
    nombre: "Universidad Intercultural de las Nacionalidades y Pueblos Indígenas Amawtay Wasi",
    siglas: "UAW",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.uaw.edu.ec"
  },
  {
    nombre: "Universidad Tecnológica de Seguridad Ciudadana y Ciencias Policiales",
    siglas: "USECIPOL",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.usecipol.edu.ec"
  },
  {
    nombre: "Facultad Latinoamericana de Ciencias Sociales",
    siglas: "FLACSO",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.flacso.edu.ec"
  },
  {
    nombre: "Instituto de Altos Estudios Nacionales",
    siglas: "IAEN",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.iaen.edu.ec"
  },
  {
    nombre: "Universidad Andina Simón Bolívar",
    siglas: "UASB",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.uasb.edu.ec"
  },
  {
    nombre: "Pontificia Universidad Católica del Ecuador",
    siglas: "PUCE",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.puce.edu.ec"
  },
  {
    nombre: "Universidad Politécnica Salesiana",
    siglas: "UPS",
    tipo: "UNIVERSIDAD",
    provincia: "Azuay",
    ciudad: "Cuenca",
    sitioWeb: "https://www.ups.edu.ec"
  },
  {
    nombre: "Universidad Técnica Particular de Loja",
    siglas: "UTPL",
    tipo: "UNIVERSIDAD",
    provincia: "Loja",
    ciudad: "Loja",
    sitioWeb: "https://www.utpl.edu.ec"
  },
  {
    nombre: "Universidad del Azuay",
    siglas: "UAZUAY",
    tipo: "UNIVERSIDAD",
    provincia: "Azuay",
    ciudad: "Cuenca",
    sitioWeb: "https://www.uazuay.edu.ec"
  },
  {
    nombre: "Universidad Católica de Cuenca",
    siglas: "UCACUE",
    tipo: "UNIVERSIDAD",
    provincia: "Azuay",
    ciudad: "Cuenca",
    sitioWeb: "https://www.ucacue.edu.ec"
  },
  {
    nombre: "Universidad Católica de Santiago de Guayaquil",
    siglas: "UCSG",
    tipo: "UNIVERSIDAD",
    provincia: "Guayas",
    ciudad: "Guayaquil",
    sitioWeb: "https://www.ucsg.edu.ec"
  },
  {
    nombre: "Universidad de Especialidades Espíritu Santo",
    siglas: "UEES",
    tipo: "UNIVERSIDAD",
    provincia: "Guayas",
    ciudad: "Samborondón",
    sitioWeb: "https://www.uees.edu.ec"
  },
  {
    nombre: "Universidad de Las Américas",
    siglas: "UDLA",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.udla.edu.ec"
  },
  {
    nombre: "Universidad San Francisco de Quito",
    siglas: "USFQ",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.usfq.edu.ec"
  },
  {
    nombre: "Universidad Tecnológica Equinoccial",
    siglas: "UTE",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.ute.edu.ec"
  },
  {
    nombre: "Universidad Indoamérica",
    siglas: "UTI",
    tipo: "UNIVERSIDAD",
    provincia: "Tungurahua",
    ciudad: "Ambato",
    sitioWeb: "https://www.uti.edu.ec"
  },
  {
    nombre: "Universidad Internacional del Ecuador",
    siglas: "UIDE",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.uide.edu.ec"
  },
  {
    nombre: "Universidad Tecnológica Ecotec",
    siglas: "ECOTEC",
    tipo: "UNIVERSIDAD",
    provincia: "Guayas",
    ciudad: "Samborondón",
    sitioWeb: "https://www.ecotec.edu.ec"
  },
  {
    nombre: "Universidad Regional Autónoma de los Andes",
    siglas: "UNIANDES",
    tipo: "UNIVERSIDAD",
    provincia: "Tungurahua",
    ciudad: "Ambato",
    sitioWeb: "https://www.uniandes.edu.ec"
  },
  {
    nombre: "Universidad Casa Grande",
    siglas: "UCG",
    tipo: "UNIVERSIDAD",
    provincia: "Guayas",
    ciudad: "Guayaquil",
    sitioWeb: "https://www.casagrande.edu.ec"
  },
  {
    nombre: "Universidad de Los Hemisferios",
    siglas: "UHE",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.uhemisferios.edu.ec"
  },
  {
    nombre: "Universidad Metropolitana",
    siglas: "UMET",
    tipo: "UNIVERSIDAD",
    provincia: "Guayas",
    ciudad: "Guayaquil",
    sitioWeb: "https://www.umet.edu.ec"
  },
  {
    nombre: "Universidad Iberoamericana del Ecuador",
    siglas: "UNIBE",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.unibe.edu.ec"
  },
  {
    nombre: "Universidad San Gregorio de Portoviejo",
    siglas: "USGP",
    tipo: "UNIVERSIDAD",
    provincia: "Manabí",
    ciudad: "Portoviejo",
    sitioWeb: "https://www.sangregorio.edu.ec"
  },
  {
    nombre: "Universidad Tecnológica Israel",
    siglas: "UISRAEL",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.uisrael.edu.ec"
  },
  {
    nombre: "Universidad Particular Internacional Sek",
    siglas: "UISEK",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.uisek.edu.ec"
  },
  {
    nombre: "Universidad Tecnológica Empresarial de Guayaquil",
    siglas: "UTEG",
    tipo: "UNIVERSIDAD",
    provincia: "Guayas",
    ciudad: "Guayaquil",
    sitioWeb: "https://www.uteg.edu.ec"
  },
  {
    nombre: "Universidad de Otavalo",
    siglas: "UO",
    tipo: "UNIVERSIDAD",
    provincia: "Imbabura",
    ciudad: "Otavalo",
    sitioWeb: "https://www.uotavalo.edu.ec"
  },
  {
    nombre: "Universidad del Pacífico",
    siglas: "UPACIFICO",
    tipo: "UNIVERSIDAD",
    provincia: "Guayas",
    ciudad: "Guayaquil",
    sitioWeb: "https://www.upacifico.edu.ec"
  },
  {
    nombre: "Universidad Laica Vicente Rocafuerte de Guayaquil",
    siglas: "ULVR",
    tipo: "UNIVERSIDAD",
    provincia: "Guayas",
    ciudad: "Guayaquil",
    sitioWeb: "https://www.ulvr.edu.ec"
  },
  {
    nombre: "Universidad Bolivariana del Ecuador",
    siglas: "UBE",
    tipo: "UNIVERSIDAD",
    provincia: "Guayas",
    ciudad: "Durán",
    sitioWeb: "https://www.ube.edu.ec"
  },
  {
    nombre: "Universidad de Especialidades Turísticas",
    siglas: "UDET",
    tipo: "UNIVERSIDAD",
    provincia: "Pichincha",
    ciudad: "Quito",
    sitioWeb: "https://www.udet.edu.ec"
  }
];

async function main() {
  console.log("Seeding/Verifying official Ecuadorian universities...");

  // Upsert all 62 universities safely
  let count = 0;
  for (const uni of officialUniversities) {
    count++;
    await prisma.university.upsert({
      where: { nombre: uni.nombre },
      update: {
        siglas: uni.siglas,
        tipo: uni.tipo,
        provincia: uni.provincia,
        ciudad: uni.ciudad,
        sitioWeb: uni.sitioWeb,
        orden: count,
        activo: true,
      },
      create: {
        nombre: uni.nombre,
        siglas: uni.siglas,
        tipo: uni.tipo,
        provincia: uni.provincia,
        ciudad: uni.ciudad,
        sitioWeb: uni.sitioWeb,
        orden: count,
        activo: true,
      },
    });
  }

  console.log(`Successfully seeded/updated ${count} official Ecuadorian universities!`);

  // Relink any existing student profiles to their matching seeded university
  const allUnis = await prisma.university.findMany({});
  const profiles = await prisma.studentProfile.findMany({});

  for (const profile of profiles) {
    if (profile.institucionEducativa) {
      const match = allUnis.find(u => 
        u.nombre.toLowerCase().trim() === profile.institucionEducativa.toLowerCase().trim() ||
        (u.siglas && profile.institucionEducativa.toLowerCase().includes(u.siglas.toLowerCase()))
      );
      if (match) {
        await prisma.studentProfile.update({
          where: { id: profile.id },
          data: {
            universityId: match.id,
            institucionEducativa: match.nombre
          }
        });
        console.log(`Linked student profile ${profile.id} to ${match.nombre}`);
      }
    }
  }
}

main()
  .catch((e) => {
    console.error("Error seeding universities:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
