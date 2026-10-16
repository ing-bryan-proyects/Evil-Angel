/**
 * Vocabulary · bancos pedagógicos del Nivel A1 (y un repaso de A2)
 * ---------------------------------------------------------------
 *   A1_WORDS   Más de 330 palabras por temas (inglés → español) para los golpes en tiempo real.
 *   A2_WORDS   Vocabulario de repaso para los enemigos de élite.
 *   A1_FILL    Más de 100 frases por completar (3 opciones + explicación en español).
 *   A1_ORDER   Más de 60 oraciones para ordenar (palabras en el orden correcto + traducción).
 *
 * Los pares se escriben como "english:español" separados por «|» para mantener el archivo compacto.
 */

const pairs = (s) => s.split("|").map((p) => p.split(":"));

const TOPICS = {
  animals: "wolf:lobo|dog:perro|cat:gato|bird:pájaro|fish:pez|horse:caballo|cow:vaca|pig:cerdo|sheep:oveja|rabbit:conejo|mouse:ratón|bear:oso|fox:zorro|owl:búho|bat:murciélago|snake:serpiente|spider:araña|frog:rana|duck:pato|chicken:pollo|lion:león|tiger:tigre|monkey:mono|elephant:elefante|deer:ciervo|butterfly:mariposa|bee:abeja|ant:hormiga|dragon:dragón|crow:cuervo",
  nature: "tree:árbol|flower:flor|grass:hierba|leaf:hoja|forest:bosque|river:río|lake:lago|mountain:montaña|hill:colina|stone:piedra|rock:roca|sand:arena|sea:mar|island:isla|moon:luna|sun:sol|star:estrella|sky:cielo|cloud:nube|rain:lluvia|snow:nieve|wind:viento|storm:tormenta|fire:fuego|water:agua|ice:hielo|earth:tierra|mud:barro|road:camino|bridge:puente|cave:cueva|field:campo|garden:jardín|mist:niebla|shadow:sombra|light:luz|night:noche|day:día|morning:la mañana|evening:tarde",
  family: "mother:madre|father:padre|brother:hermano|sister:hermana|son:hijo|daughter:hija|grandmother:abuela|grandfather:abuelo|uncle:tío|aunt:tía|friend:amigo|baby:bebé|man:hombre|woman:mujer|boy:niño|girl:niña|people:gente|king:rey|queen:reina|knight:caballero|hunter:cazador|angel:ángel|ghost:fantasma|witch:bruja|giant:gigante|thief:ladrón|teacher:profesor|doctor:médico|farmer:granjero",
  body: "head:cabeza|hair:pelo|face:cara|eye:ojo|ear:oreja|nose:nariz|mouth:boca|tooth:diente|neck:cuello|arm:brazo|hand:mano|finger:dedo|leg:pierna|foot:pie|heart:corazón|back:espalda|wing:ala|skin:piel|blood:sangre|bone:hueso|tail:cola|claw:garra",
  food: "bread:pan|water:agua|milk:leche|cheese:queso|egg:huevo|meat:carne|apple:manzana|pear:pera|banana:plátano|orange:naranja|lemon:limón|grape:uva|cake:tarta|soup:sopa|rice:arroz|salad:ensalada|potato:patata|tomato:tomate|carrot:zanahoria|honey:miel|sugar:azúcar|salt:sal|tea:té|coffee:café|wine:vino|breakfast:desayuno|lunch:almuerzo|dinner:cena|fruit:fruta|vegetable:verdura",
  house: "house:casa|door:puerta|window:ventana|wall:pared|roof:tejado|floor:suelo|room:habitación|kitchen:cocina|bed:cama|table:mesa|chair:silla|lamp:lámpara|candle:vela|mirror:espejo|key:llave|box:caja|bag:bolsa|bottle:botella|cup:taza|plate:plato|knife:cuchillo|spoon:cuchara|fork:tenedor|bell:campana|clock:reloj|stair:escalón|chimney:chimenea|barrel:barril|cart:carro|well:pozo",
  clothes: "hat:sombrero|coat:abrigo|shirt:camisa|dress:vestido|shoe:zapato|boot:bota|glove:guante|scarf:bufanda|belt:cinturón|ring:anillo|necklace:collar|crown:corona|cloak:capa|mask:máscara|pocket:bolsillo",
  school: "book:libro|page:página|pen:bolígrafo|paper:papel|letter:carta|word:palabra|name:nombre|number:número|map:mapa|picture:imagen|song:canción|story:historia|question:pregunta|answer:respuesta|lesson:lección|school:escuela|class:clase|test:examen|game:juego|toy:juguete",
  colors: "red:rojo|blue:azul|green:verde|yellow:amarillo|black:negro|white:blanco|gray:gris|brown:marrón|purple:morado|pink:rosa|gold:oro|silver:plata|orange (color):naranja (color)|dark:oscuro|bright:brillante",
  numbers: "one:uno|two:dos|three:tres|four:cuatro|five:cinco|six:seis|seven:siete|eight:ocho|nine:nueve|ten:diez|twenty:veinte|hundred:cien|thousand:mil|first:primero|second:segundo|last:último|half:mitad|zero:cero",
  time: "today:hoy|tomorrow:mañana (día siguiente)|yesterday:ayer|week:semana|month:mes|year:año|hour:hora|minute:minuto|Monday:lunes|Tuesday:martes|Wednesday:miércoles|Thursday:jueves|Friday:viernes|Saturday:sábado|Sunday:domingo|spring:primavera|summer:verano|autumn:otoño|winter:invierno|always:siempre|never:nunca|now:ahora|soon:pronto|early:temprano",
  places: "city:ciudad|village:aldea|castle:castillo|tower:torre|church:iglesia|shop:tienda|market:mercado|street:calle|park:parque|farm:granja|prison:prisión|temple:templo|ruins:ruinas|grave:tumba|gate:portón|path:sendero|home:hogar|world:mundo|country:país|north:norte|south:sur|east:este|west:oeste",
  verbs: "go:ir|come:venir|run:correr|walk:caminar|jump:saltar|fly:volar|fall:caer|swim:nadar|climb:subir|stop:parar|open:abrir|close:cerrar|eat:comer|drink:beber|sleep:dormir|wake:despertar|see:ver|look:mirar|hear:oír|listen:escuchar|speak:hablar|say:decir|ask:preguntar|answer (verb):responder|read:leer|write:escribir|learn:aprender|know:saber|think:pensar|want:querer|need:necesitar|like:gustar|love:amar|hate:odiar|help:ayudar|give:dar|take:coger|find:encontrar|lose:perder|make:hacer|use:usar|play:jugar|work:trabajar|live:vivir|die:morir|fight:luchar|win:ganar|hide:esconder|wait:esperar|carry:llevar|bring:traer|buy:comprar|sell:vender|break:romper|build:construir|burn:quemar|cut:cortar|push:empujar|pull:tirar|throw:lanzar|catch:atrapar|kill:matar|save:salvar|pray:rezar|sing:cantar|dance:bailar|laugh:reír|cry:llorar|smile:sonreír|remember:recordar|forget:olvidar|follow:seguir|leave:dejar|stay:quedarse|try:intentar|show:mostrar|call:llamar|turn:girar|touch:tocar|feel:sentir",
  adjectives: "big:grande|small:pequeño|long:largo|short:corto|tall:alto|old:viejo|new:nuevo|young:joven|good:bueno|bad:malo|happy:feliz|sad:triste|angry:enfadado|afraid:asustado|brave:valiente|strong:fuerte|weak:débil|fast:rápido|slow:lento|hot:caliente|cold:frío|warm:templado|wet:mojado|dry:seco|dirty:sucio|clean:limpio|empty:vacío|full:lleno|heavy:pesado|easy:fácil|hard:difícil|beautiful:hermoso|ugly:feo|rich:rico|poor:pobre|hungry:hambriento|thirsty:sediento|tired:cansado|sick:enfermo|dead:muerto|alive:vivo|wild:salvaje|quiet:silencioso|loud:ruidoso|dangerous:peligroso|safe:seguro|true:verdadero|false:falso|free:libre|lost:perdido|broken:roto|holy:sagrado|evil:malvado|magic:mágico|secret:secreto|ancient:antiguo",
  things: "sword:espada|shield:escudo|bow:arco|arrow:flecha|axe:hacha|armor:armadura|potion:poción|coin:moneda|treasure:tesoro|gem:gema|chest:cofre|lantern:linterna|torch:antorcha|rope:cuerda|ladder:escalera de mano|chain:cadena|seal:sello|spell:hechizo|prayer:oración|crystal:cristal|feather:pluma|statue:estatua|robot:robot|machine:máquina|wheel:rueda|stone wall:muro de piedra|pillar:pilar|altar:altar|cross:cruz|skull:calavera",
  abstract: "life:vida|death:muerte|love (noun):amor|hope:esperanza|fear:miedo|dream:sueño|truth:verdad|power:poder|peace:paz|war:guerra|danger:peligro|luck:suerte|voice:voz|noise:ruido|food:comida|money:dinero|time:tiempo|place:lugar|thing:cosa|idea:idea|problem:problema|help (noun):ayuda|journey:viaje|memory:recuerdo|soul:alma|spirit:espíritu|god:dios|hell:infierno",
};

/** Todas las palabras A1 (sin duplicados por la palabra inglesa). */
export const A1_WORDS = (() => {
  const seen = new Set(), out = [];
  for (const topic of Object.values(TOPICS)) for (const [en, es] of pairs(topic)) {
    if (seen.has(en) || en.includes("(")) continue;
    seen.add(en);
    out.push([en, es]);
  }
  return Object.freeze(out);
})();

/** Por temas, por si se quieren palabras de un ámbito concreto. */
export const A1_TOPICS = Object.freeze(Object.fromEntries(Object.entries(TOPICS).map(([k, v]) => [k, pairs(v).filter(([en]) => !en.includes("("))])));

export const A2_WORDS = Object.freeze(pairs(
  "shield:escudo|bridge:puente|castle:castillo|coin:moneda|shadow:sombra|candle:vela|feather:pluma|mountain:montaña|storm:tormenta|hunter:cazador|" +
  "journey:viaje|danger:peligro|courage:valentía|enemy:enemigo|weapon:arma|wound:herida|healer:curandero|prisoner:prisionero|stranger:forastero|guardian:guardián|" +
  "ancient:antiguo|cursed:maldito|hidden:oculto|lonely:solitario|fierce:feroz|gentle:amable|ruined:en ruinas|sacred:sagrado|forbidden:prohibido|invisible:invisible|" +
  "believe:creer|decide:decidir|escape:escapar|protect:proteger|promise:prometer|search:buscar|trust:confiar|warn:advertir|whisper:susurrar|wander:vagar|" +
  "although:aunque|during:durante|between:entre|beyond:más allá|against:contra|without:sin|through:a través de|toward:hacia|behind:detrás|above:encima"
));

/**
 * Frases por completar A1. `q` lleva «___», `o` tres opciones, `a` el índice correcto, `ex` la explicación.
 */
const F = (q, o, a, ex, tag = "misc") => ({ q, o, a, ex, tag });
export const A1_FILL = Object.freeze([
  // verbo to be
  F("The beasts ___ howling in the dark.", ["is", "are", "am"], 1, "«Beasts» es plural (they) → are.", "tobe"),
  F("I ___ an angel of light.", ["am", "is", "are"], 0, "Con «I» siempre usamos am.", "tobe"),
  F("Abel ___ very brave.", ["are", "am", "is"], 2, "Abel = he (3.ª persona singular) → is.", "tobe"),
  F("We ___ not afraid of the dark.", ["is", "am", "are"], 2, "Con «we» usamos are.", "tobe"),
  F("My wings ___ broken.", ["is", "am", "are"], 2, "«Wings» es plural → are.", "tobe"),
  F("You ___ my friend.", ["is", "are", "am"], 1, "Con «you» usamos are.", "tobe"),
  F("She ___ a healer.", ["is", "are", "am"], 0, "«She» → is.", "tobe"),
  F("It ___ cold tonight.", ["are", "is", "am"], 1, "«It» → is.", "tobe"),
  F("The wolves ___ hungry.", ["is", "are", "am"], 1, "«Wolves» es plural → are.", "tobe"),
  F("___ you tired?", ["Is", "Are", "Am"], 1, "Pregunta con «you» → Are you…?", "tobe"),
  F("___ he a knight?", ["Is", "Are", "Do"], 0, "Pregunta con «he» → Is he…?", "tobe"),
  F("I ___ not a thief.", ["is", "am", "are"], 1, "Negativo con «I» → am not.", "tobe"),
  F("They ___ not here.", ["isn't", "aren't", "amn't"], 1, "Negativo con «they» → aren't.", "tobe"),
  F("The door ___ open.", ["are", "is", "am"], 1, "«Door» es singular → is.", "tobe"),
  // artículos
  F("This is ___ old forest.", ["a", "an", "two"], 1, "«Old» empieza por sonido vocálico → an.", "articles"),
  F("He has ___ sword.", ["a", "an", "the"], 0, "«Sword» empieza por consonante → a.", "articles"),
  F("She eats ___ apple every day.", ["a", "an", "some"], 1, "«Apple» empieza por vocal → an.", "articles"),
  F("I see ___ owl in the tree.", ["a", "an", "two"], 1, "«Owl» empieza por sonido vocálico → an.", "articles"),
  F("Look at ___ moon! It is red.", ["a", "an", "the"], 2, "Solo hay una luna → the.", "articles"),
  F("It is ___ hour of darkness.", ["a", "an", "the"], 1, "«Hour» tiene la h muda → an.", "articles"),
  // have / has
  F("The robot ___ a red light on its head.", ["have", "has", "having"], 1, "3.ª persona singular (it) → has.", "have"),
  F("I ___ a small key.", ["has", "have", "haves"], 1, "Con «I» usamos have.", "have"),
  F("They ___ two horses.", ["have", "has", "is"], 0, "Con «they» usamos have.", "have"),
  F("Aria ___ long hair.", ["have", "has", "are"], 1, "Aria = she → has.", "have"),
  F("We ___ a map and a lantern.", ["has", "have", "is"], 1, "Con «we» usamos have.", "have"),
  // presente simple
  F("The wolf ___ in the forest.", ["lives", "live", "living"], 0, "Presente simple, 3.ª persona singular → verbo + -s.", "present"),
  F("I ___ in a small village.", ["lives", "live", "living"], 1, "Con «I» el verbo no lleva -s.", "present"),
  F("He ___ like the shadows.", ["don't", "doesn't", "isn't"], 1, "Negativo en 3.ª persona singular → doesn't + verbo.", "present"),
  F("___ you see the light?", ["Does", "Do", "Is"], 1, "Pregunta en presente simple con «you» → Do.", "present"),
  F("___ she know the way?", ["Do", "Does", "Is"], 1, "Pregunta con «she» → Does + verbo base.", "present"),
  F("We ___ not eat meat.", ["do", "does", "are"], 0, "Negativo con «we» → do not (don't).", "present"),
  F("The sun ___ in the east.", ["rise", "rises", "rising"], 1, "«Sun» = it → rises (con -s).", "present"),
  F("Benny ___ the door every morning.", ["open", "opens", "opening"], 1, "3.ª persona singular → opens.", "present"),
  F("My brother ___ to school by bus.", ["go", "goes", "going"], 1, "«Go» + he/she/it → goes.", "present"),
  F("They ___ the bells at night.", ["hear", "hears", "hearing"], 0, "Con «they» → hear (sin -s).", "present"),
  F("He ___ not like spiders.", ["do", "does", "is"], 1, "Negativo con «he» → does not.", "present"),
  F("What ___ you eat for lunch?", ["do", "does", "are"], 0, "Pregunta con «you» → do.", "present"),
  // there is / are
  F("There ___ three moons tonight.", ["is", "are", "am"], 1, "«Three moons» es plural → there are.", "there"),
  F("There ___ a bridge over the river.", ["is", "are", "have"], 0, "«A bridge» es singular → there is.", "there"),
  F("There ___ many stars in the sky.", ["is", "are", "has"], 1, "«Many stars» es plural → there are.", "there"),
  F("Is there ___ water in the well?", ["some", "any", "an"], 1, "En preguntas usamos any.", "there"),
  F("There ___ any food left.", ["isn't", "aren't", "don't"], 0, "«Food» es incontable → there isn't any.", "there"),
  // pronombres y posesivos
  F("Look! ___ is a magic beast.", ["They", "It", "We"], 1, "Una sola bestia (singular) → It is.", "pronouns"),
  F("This is Abel. ___ wings are broken.", ["Her", "His", "Their"], 1, "Abel es masculino → his.", "pronouns"),
  F("Aria has a bag. ___ bag is red.", ["His", "Her", "My"], 1, "Aria es femenino → her.", "pronouns"),
  F("We love ___ forest.", ["our", "their", "his"], 0, "Con «we» → our.", "pronouns"),
  F("The wolf licks ___ paw.", ["it's", "its", "his"], 1, "Posesivo de «it» → its (sin apóstrofo).", "pronouns"),
  F("Give the key to ___, please.", ["I", "me", "my"], 1, "Después de «to» usamos el pronombre objeto → me.", "pronouns"),
  F("The robot helped ___.", ["we", "us", "our"], 1, "Pronombre objeto de «we» → us.", "pronouns"),
  F("___ is my sister. She is kind.", ["He", "She", "It"], 1, "Hermana = she.", "pronouns"),
  F("Is this book ___?", ["your", "yours", "you"], 1, "Sin sustantivo detrás → yours.", "pronouns"),
  F("Those are ___ swords. Give them back!", ["our", "we", "us"], 0, "Posesivo antes de un sustantivo → our.", "pronouns"),
  // demostrativos
  F("___ tree here is very old.", ["This", "These", "Those"], 0, "Singular y cerca → this.", "demo"),
  F("___ stones over there are heavy.", ["That", "Those", "This"], 1, "Plural y lejos → those.", "demo"),
  F("Look at ___ birds near me!", ["this", "that", "these"], 2, "Plural y cerca → these.", "demo"),
  F("What is ___ on the hill?", ["this", "that", "these"], 1, "Singular y lejos → that.", "demo"),
  // plurales
  F("I see two ___ in the garden.", ["wolfs", "wolves", "wolf"], 1, "Plural irregular: wolf → wolves.", "plurals"),
  F("There are three ___ on the table.", ["knifes", "knives", "knife"], 1, "Plural irregular: knife → knives.", "plurals"),
  F("The ___ are sleeping.", ["child", "children", "childs"], 1, "Plural irregular: child → children.", "plurals"),
  F("Many ___ live in the village.", ["man", "mans", "men"], 2, "Plural irregular: man → men.", "plurals"),
  F("She has two ___.", ["foots", "feet", "foot"], 1, "Plural irregular: foot → feet.", "plurals"),
  F("I can see five ___ in the sky.", ["bird", "birds", "birdes"], 1, "Plural regular: bird → birds.", "plurals"),
  F("The ___ are in the box.", ["mouses", "mice", "mouse"], 1, "Plural irregular: mouse → mice.", "plurals"),
  // preposiciones
  F("The key is ___ the table.", ["in", "on", "at"], 1, "Sobre una superficie → on.", "preps"),
  F("The cat is ___ the box.", ["in", "on", "under"], 0, "Dentro de → in.", "preps"),
  F("The dog sleeps ___ the bed.", ["under", "at", "to"], 0, "Debajo de → under.", "preps"),
  F("We live ___ a small house.", ["on", "in", "at"], 1, "Dentro de un lugar cerrado → in.", "preps"),
  F("School starts ___ nine o'clock.", ["in", "at", "on"], 1, "Para horas exactas → at.", "preps"),
  F("My birthday is ___ Monday.", ["in", "at", "on"], 2, "Para días de la semana → on.", "preps"),
  F("It rains a lot ___ winter.", ["in", "on", "at"], 0, "Para estaciones → in.", "preps"),
  F("The bridge is ___ the river and the castle.", ["between", "behind", "on"], 0, "Entre dos cosas → between.", "preps"),
  F("Abel walks ___ the forest.", ["through", "at", "on"], 0, "«Through» = a través de un espacio.", "preps"),
  F("The bird flies ___ the tower.", ["above", "at", "in"], 0, "«Above» = por encima de.", "preps"),
  F("The moon is ___ the clouds.", ["behind", "to", "at"], 0, "«Behind» = detrás de.", "preps"),
  F("We walk ___ the village.", ["to", "at", "in"], 0, "Movimiento hacia un lugar → to.", "preps"),
  // can / modales básicos
  F("Abel ___ fly with broken wings.", ["can", "can't", "cans"], 1, "Con alas rotas no puede volar → can't.", "can"),
  F("I ___ swim very fast.", ["can", "cans", "am"], 0, "Habilidad → can + verbo.", "can"),
  F("___ you help me, please?", ["Can", "Do", "Are"], 0, "Para pedir ayuda → Can you…?", "can"),
  F("She can ___ the door.", ["opens", "open", "to open"], 1, "Tras can, el verbo va en forma base.", "can"),
  F("Wolves ___ climb trees.", ["can't", "doesn't", "aren't"], 0, "Los lobos no pueden trepar → can't.", "can"),
  // preguntas
  F("___ is your name?", ["What", "Who", "Where"], 0, "Para preguntar el nombre → What.", "wh"),
  F("___ is the robot? It is in the forest.", ["Who", "Where", "When"], 1, "Pregunta por el lugar → Where.", "wh"),
  F("___ are you? I am Abel.", ["Who", "What", "Why"], 0, "Pregunta por la persona → Who.", "wh"),
  F("___ do you go to sleep? At ten.", ["When", "Where", "Who"], 0, "Pregunta por el momento → When.", "wh"),
  F("___ is the shop closed? Because it is night.", ["Why", "Who", "What"], 0, "Pregunta por la razón → Why.", "wh"),
  F("___ old are you?", ["How", "What", "Who"], 0, "Pregunta por la edad → How old.", "wh"),
  F("___ coins do you have?", ["How much", "How many", "How"], 1, "Contable en plural → How many.", "wh"),
  F("___ water do you need?", ["How many", "How much", "How old"], 1, "Incontable → How much.", "wh"),
  // imperativos y órdenes
  F("___ the door, please. It is cold.", ["Close", "Closes", "Closing"], 0, "Imperativo: verbo en forma base.", "imper"),
  F("___ run! The wolf is slow.", ["Don't", "Doesn't", "Not"], 0, "Prohibición → Don't + verbo.", "imper"),
  F("___ careful! The ground is wet.", ["Be", "Is", "Are"], 0, "Imperativo de to be → Be.", "imper"),
  F("Please ___ me the way.", ["show", "shows", "showing"], 0, "Tras please, verbo en forma base.", "imper"),
  // gustos y verbos comunes
  F("I ___ apples. They are sweet.", ["like", "likes", "liking"], 0, "Con «I» → like.", "likes"),
  F("She ___ reading old books.", ["love", "loves", "loving"], 1, "«She» → loves.", "likes"),
  F("He ___ a sword and a shield.", ["want", "wants", "wanting"], 1, "«He» → wants.", "likes"),
  F("We ___ water. We are thirsty.", ["need", "needs", "needing"], 0, "Con «we» → need.", "likes"),
  F("They are ___ to the castle.", ["go", "going", "goes"], 1, "Presente continuo: are + verbo-ing.", "likes"),
  F("Benny is ___ a song.", ["sing", "singing", "sings"], 1, "Presente continuo: is + verbo-ing.", "likes"),
  F("I am ___ for my friend.", ["wait", "waiting", "waits"], 1, "Presente continuo: am + verbo-ing.", "likes"),
  F("The children ___ playing in the garden.", ["is", "are", "am"], 1, "«Children» es plural → are playing.", "likes"),
  // adjetivos y comparaciones simples
  F("The giant is ___ than the knight.", ["big", "bigger", "biggest"], 1, "Comparativo corto: big → bigger + than.", "adj"),
  F("This is the ___ tower in the city.", ["tall", "taller", "tallest"], 2, "Superlativo: the + -est.", "adj"),
  F("A mouse is ___ than a horse.", ["small", "smaller", "smallest"], 1, "Comparativo: small → smaller.", "adj"),
  F("Fire is ___ than water.", ["hot", "hotter", "hottest"], 1, "Comparativo con duplicación: hot → hotter.", "adj"),
  F("She is a ___ girl. She is never afraid.", ["brave", "bravely", "bravery"], 0, "Adjetivo delante de un sustantivo → brave.", "adj"),
  // vocabulario en contexto
  F("It is dark. Light a ___.", ["candle", "chair", "bread"], 0, "Para tener luz → candle (vela).", "vocab"),
  F("I am thirsty. I need some ___.", ["water", "stone", "sword"], 0, "Thirsty = sediento → water.", "vocab"),
  F("The ___ is red and very hot.", ["fire", "ice", "snow"], 0, "Rojo y caliente → fire.", "vocab"),
  F("We open the door with a ___.", ["key", "cup", "bed"], 0, "Para abrir una puerta → key.", "vocab"),
  F("Birds have two ___ to fly.", ["legs", "wings", "hands"], 1, "Para volar → wings (alas).", "vocab"),
  F("The sun shines in the ___.", ["sky", "floor", "sea"], 0, "El sol brilla en el cielo → sky.", "vocab"),
  F("A ___ lives in a castle and wears a crown.", ["king", "farmer", "hunter"], 0, "Corona y castillo → king.", "vocab"),
  F("We read a ___ to learn new words.", ["book", "boot", "bone"], 0, "Para aprender palabras → book.", "vocab"),
  F("It is ___ in winter. Take your coat.", ["cold", "hot", "wet"], 0, "Invierno → cold.", "vocab"),
  F("Today is Monday. Tomorrow is ___.", ["Sunday", "Tuesday", "Friday"], 1, "Después de lunes → Tuesday.", "vocab"),
  F("One, two, three, ___.", ["five", "four", "ten"], 1, "Después de three → four.", "vocab"),
  F("I eat breakfast in the ___.", ["morning", "night", "evening"], 0, "El desayuno es por la mañana → morning.", "vocab"),
  F("The opposite of «big» is ___.", ["small", "tall", "old"], 0, "Opuesto de big → small.", "vocab"),
  F("The opposite of «hot» is ___.", ["warm", "cold", "dry"], 1, "Opuesto de hot → cold.", "vocab"),
  F("A person who treats sick people is a ___.", ["doctor", "baker", "thief"], 0, "Cura a los enfermos → doctor.", "vocab"),
]);

/**
 * Oraciones por ordenar A1: `words` en el orden correcto (el combate las baraja).
 */
const O = (s, es) => ({ words: s.split(" "), es });
export const A1_ORDER = Object.freeze([
  O("I am an angel", "Soy un ángel."),
  O("Abel is very brave", "Abel es muy valiente."),
  O("She has a red coat", "Ella tiene un abrigo rojo."),
  O("The wolf lives in the forest", "El lobo vive en el bosque."),
  O("We are not afraid", "No tenemos miedo."),
  O("They have two horses", "Ellos tienen dos caballos."),
  O("There is a bridge here", "Hay un puente aquí."),
  O("He can open the door", "Él puede abrir la puerta."),
  O("Where is the key ?", "¿Dónde está la llave?"),
  O("What is your name ?", "¿Cómo te llamas?"),
  O("Do you like apples ?", "¿Te gustan las manzanas?"),
  O("My friend is a knight", "Mi amigo es un caballero."),
  O("The moon is very big", "La luna es muy grande."),
  O("I see a bird in the tree", "Veo un pájaro en el árbol."),
  O("Open the door please", "Abre la puerta, por favor."),
  O("Don't run in the dark", "No corras en la oscuridad."),
  O("It is cold in winter", "Hace frío en invierno."),
  O("Aria has long brown hair", "Aria tiene el pelo largo y castaño."),
  O("Benny likes to sing", "A Benny le gusta cantar."),
  O("Mileva is a strong woman", "Mileva es una mujer fuerte."),
  O("The robot is in the ruins", "El robot está en las ruinas."),
  O("We walk to the castle", "Caminamos hacia el castillo."),
  O("I need some water", "Necesito un poco de agua."),
  O("She does not know the way", "Ella no sabe el camino."),
  O("The stars are bright tonight", "Las estrellas brillan esta noche."),
  O("He is reading an old book", "Él está leyendo un libro viejo."),
  O("Can you help me ?", "¿Puedes ayudarme?"),
  O("The shop is near the river", "La tienda está cerca del río."),
  O("I live in a small house", "Vivo en una casa pequeña."),
  O("This is my sword", "Esta es mi espada."),
  O("Those trees are very tall", "Esos árboles son muy altos."),
  O("How many coins do you have ?", "¿Cuántas monedas tienes?"),
  O("The children are playing outside", "Los niños están jugando fuera."),
  O("She is not at home", "Ella no está en casa."),
  O("We eat bread and cheese", "Comemos pan y queso."),
  O("The dog sleeps under the table", "El perro duerme bajo la mesa."),
  O("I can swim but I can't fly", "Sé nadar pero no puedo volar."),
  O("He wakes up at seven", "Él se despierta a las siete."),
  O("It rains a lot in autumn", "Llueve mucho en otoño."),
  O("Who is the king of this land ?", "¿Quién es el rey de esta tierra?"),
  O("Abel falls from the sky", "Abel cae del cielo."),
  O("The ghost lives in the tower", "El fantasma vive en la torre."),
  O("Listen to the bells", "Escucha las campanas."),
  O("I have a lantern and a map", "Tengo una linterna y un mapa."),
  O("The wolves are hungry and angry", "Los lobos están hambrientos y enfadados."),
  O("Please give me the potion", "Por favor, dame la poción."),
  O("My mother makes good soup", "Mi madre hace buena sopa."),
  O("Why are you sad ?", "¿Por qué estás triste?"),
  O("The bridge is old and broken", "El puente es viejo y está roto."),
  O("They go to the market on Sunday", "Van al mercado el domingo."),
  O("I like the green forest", "Me gusta el bosque verde."),
  O("The golem is big and strong", "El gólem es grande y fuerte."),
  O("She can see the mountain", "Ella puede ver la montaña."),
  O("Do not touch the fire", "No toques el fuego."),
  O("We are friends now", "Ahora somos amigos."),
  O("He is behind the wall", "Él está detrás del muro."),
  O("The cat is on the chair", "El gato está sobre la silla."),
  O("What time is it ?", "¿Qué hora es?"),
  O("I want a cup of tea", "Quiero una taza de té."),
  O("The light is warm and golden", "La luz es cálida y dorada."),
  O("Abel and Chloe are brave", "Abel y Chloe son valientes."),
  O("It is a beautiful night", "Es una noche hermosa."),
]);
