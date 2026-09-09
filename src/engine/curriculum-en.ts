/**
 * 영어 급수표 — 3~6학년, 학기마다 30급.
 *
 * 🔴 왜 파일을 나눴나: 국어 급수표는 537급 3,300줄이다. 여기에 영어를 이어 붙이면
 * 교실에서 매일 쓰는 파일을 영어 작업 때마다 건드리게 된다. 과목이 다르면 파일도 나눈다 —
 * 영어 쪽이 깨져도 국어 급수표는 그 자리에 그대로 있다.
 *
 * 문항 근거: 2022 개정 영어과 교육과정(초등 3~6학년) 권장 어휘·의사소통 기능.
 * 파닉스(단모음 → 겹자음 → 장모음 → 묵음)와 철자 규칙(겹글자·어미·ie/ei)을 학년에 맞춰 돌린다.
 * 교과서 문장을 옮기지 않고 직접 지었고, 두 계열로 교차검증해 걸렀다.
 *
 * 음원은 이 파일의 id 를 그대로 경로로 쓴다: `audio/<id>/<두 자리 번호>.mp3`
 * (영어는 piper en_US-ljspeech-high 로 굽는다 — 퍼블릭 도메인이라 상업적 이용도 걸리지 않는다.
 *  국어의 Supertonic 으로 영어를 읽히면 한국어 음운으로 읽어 «배우는 데 해롭다».)
 */

import type { LevelSheet } from './curriculum';

// 229급 · 2290문항. gpt-web·gemini-web 로 짓고
// 사전(37만 낱말)·형식 검사로 거른 뒤 codex(gpt-6-astra)와 «지은 쪽이 아닌» 웹 브릿지로
// 교차검증해 지적된 문항을 «고치지 않고 뺐다». 마지막 갱신 2026-09-09.
export const CURRICULUM_EN: LevelSheet[] = [
  {
    id: 'e3-1-01', subject: 'en', grade: 3, semester: 1, level: 1,
    title: 'home · a 소리가 나는 낱말', point: '단모음a',
    items: ['cat', 'hat', 'bag', 'map', 'cap', 'fan', 'bat', 'jam', 'man', 'sad'],
  },
  {
    id: 'e3-1-02', subject: 'en', grade: 3, semester: 1, level: 2,
    title: 'nature · i 소리가 나는 낱말', point: '단모음i',
    items: ['big', 'sit', 'six', 'fish', 'pig', 'hill', 'milk', 'pink', 'wind', 'swim'],
  },
  {
    id: 'e3-1-03', subject: 'en', grade: 3, semester: 1, level: 3,
    title: 'food · o 소리가 나는 낱말', point: '단모음o',
    items: ['hot', 'dog', 'box', 'fox', 'pot', 'mom', 'top', 'shop', 'stop', 'rock'],
  },
  {
    id: 'e3-1-04', subject: 'en', grade: 3, semester: 1, level: 4,
    title: 'my town · u 소리가 나는 낱말', point: '단모음u',
    items: ['bus', 'sun', 'cup', 'run', 'duck', 'jump', 'truck', 'lunch', 'mud', 'hut'],
  },
  {
    id: 'e3-1-05', subject: 'en', grade: 3, semester: 1, level: 5,
    title: 'feelings · e 소리가 나는 낱말', point: '단모음e',
    items: ['red', 'yes', 'get', 'help', 'best', 'rest', 'left', 'next', 'well', 'tell'],
  },
  {
    id: 'e3-1-06', subject: 'en', grade: 3, semester: 1, level: 6,
    title: 'colors · 색깔을 나타내는 낱말', point: '색깔',
    items: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white'],
  },
  {
    id: 'e3-1-07', subject: 'en', grade: 3, semester: 1, level: 7,
    title: 'travel · 수를 나타내는 낱말', point: '숫자',
    items: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
  },
  {
    id: 'e3-1-08', subject: 'en', grade: 3, semester: 1, level: 8,
    title: 'daily life · 동물을 나타내는 낱말', point: '동물',
    items: ['cat', 'dog', 'pig', 'cow', 'duck', 'horse', 'sheep', 'rabbit', 'mouse', 'bird'],
  },
  {
    id: 'e3-1-09', subject: 'en', grade: 3, semester: 1, level: 9,
    title: 'weather · 먹을 것을 나타내는 낱말', point: '음식',
    items: ['apple', 'milk', 'cake', 'rice', 'egg', 'bread', 'fish', 'soup', 'tea', 'water'],
  },
  {
    id: 'e3-1-10', subject: 'en', grade: 3, semester: 1, level: 10,
    title: 'the body · 학교에서 쓰는 물건 낱말', point: '학용품',
    items: ['pen', 'book', 'desk', 'bag', 'ruler', 'pencil', 'eraser', 'box', 'board', 'chair'],
  },
  {
    id: 'e3-1-11', subject: 'en', grade: 3, semester: 1, level: 11,
    title: 'school · 인사하고 답하는 문장', point: '인사말',
    items: ['Hello, Jane!', 'Good morning.', 'Hi, Sam.', 'Nice to meet you.', 'Good afternoon.', 'See you later.', 'Good night, Mom.', 'Have a good day.', 'Bye, see you.', 'How do you do?'],
  },
  {
    id: 'e3-1-12', subject: 'en', grade: 3, semester: 1, level: 12,
    title: 'seasons · 나를 소개하는 문장', point: 'I am',
    items: ['I am hot.', 'I am cold.', 'I am ready for fall.', 'I am warm.', 'I am happy in spring.', 'I am cool.', 'I am outside.', 'I am in the snow.', 'I am under a tree.', 'I am glad.'],
  },
  {
    id: 'e3-1-13', subject: 'en', grade: 3, semester: 1, level: 13,
    title: 'clothes · 무엇인지 말하는 문장', point: 'It is',
    items: ['It is a cap.', 'It is my hat.', 'It is a shirt.', 'It is your coat.', 'It is a skirt.', 'It is my dress.', 'It is a sock.', 'It is your shoe.', 'It is a jacket.', 'It is my glove.'],
  },
  {
    id: 'e3-1-14', subject: 'en', grade: 3, semester: 1, level: 14,
    title: 'family · 짧게 묻는 문장 (Do you like it? / Is it a cat?)', point: '짧은물음',
    items: ['Who is he?', 'Who is she?', 'Is he your dad?', 'Is she your mom?', 'Is he your brother?', 'Is she your sister?', 'Is this your family?', 'Is that your baby?', 'Who is your mom?', 'Who is your dad?'],
  },
  {
    id: 'e3-1-15', subject: 'en', grade: 3, semester: 1, level: 15,
    title: 'sports · 짧게 답하는 말 (Yes, I do. / No, it is not. 처럼)', point: '짧은대답',
    items: ['Yes, I do.', 'No, I don\'t.', 'Yes, I can.', 'No, I can\'t.', 'I like soccer.', 'I play baseball.', 'I can swim.', 'I like tennis.', 'I play basketball.', 'I can run fast.'],
  },
  {
    id: 'e3-1-16', subject: 'en', grade: 3, semester: 1, level: 16,
    title: 'toys · a 소리가 나는 낱말', point: '단모음a',
    items: ['dad', 'can', 'van', 'pan', 'ant', 'flag', 'lamp', 'math', 'happy', 'rabbit'],
  },
  {
    id: 'e3-1-17', subject: 'en', grade: 3, semester: 1, level: 17,
    title: 'friends · i 소리가 나는 낱말', point: '단모음i',
    items: ['kid', 'him', 'his', 'win', 'hit', 'lip', 'gift', 'sing', 'kick', 'sick'],
  },
  {
    id: 'e3-1-18', subject: 'en', grade: 3, semester: 1, level: 18,
    title: 'hobbies · o 소리가 나는 낱말', point: '단모음o',
    items: ['job', 'not', 'lot', 'hop', 'jog', 'doll', 'golf', 'song', 'pond', 'block'],
  },
  {
    id: 'e3-1-19', subject: 'en', grade: 3, semester: 1, level: 19,
    title: 'music · u 소리가 나는 낱말', point: '단모음u',
    items: ['fun', 'drum', 'club', 'luck', 'hug', 'gum', 'nut', 'but', 'rub', 'sum'],
  },
  {
    id: 'e3-1-20', subject: 'en', grade: 3, semester: 1, level: 20,
    title: 'animals · e 소리가 나는 낱말', point: '단모음e',
    items: ['hen', 'pet', 'leg', 'egg', 'bed', 'pen', 'ten', 'net', 'wet', 'men'],
  },
  {
    id: 'e3-1-21', subject: 'en', grade: 3, semester: 1, level: 21,
    title: 'home · 색깔을 나타내는이 든 문장', point: '색깔',
    items: ['My cap is red.', 'This bag is blue.', 'Her hat is pink.', 'That cup is green.', 'Your pen is black.', 'His box is white.', 'The bus is yellow.', 'A kite is purple.', 'These socks are gray.', 'Those shoes are brown.'],
  },
  {
    id: 'e3-1-22', subject: 'en', grade: 3, semester: 1, level: 22,
    title: 'nature · 수를 나타내는이 든 문장', point: '숫자',
    items: ['I see four ducks.', 'We have two cats.', 'Five birds can fly.', 'Count the six stars.', 'There are ten balls.', 'She has three dolls.', 'He sees seven fish.', 'Nine frogs jump.', 'Eight ants walk.', 'One rabbit runs.'],
  },
  {
    id: 'e3-1-23', subject: 'en', grade: 3, semester: 1, level: 23,
    title: 'food · 동물을 나타내는이 든 문장', point: '동물',
    items: ['I see a big dog.', 'The cat is cute.', 'A bird can fly.', 'Look at the rabbit!', 'My fish can swim.', 'That duck is small.', 'Can a frog jump?', 'Here is a monkey.', 'The pig is pink.', 'This cow is big.'],
  },
  {
    id: 'e3-1-24', subject: 'en', grade: 3, semester: 1, level: 24,
    title: 'my town · 먹을 것을 나타내는이 든 문장', point: '음식',
    items: ['I like apples.', 'This cake is good.', 'Eat some rice.', 'Have a banana.', 'My soup is hot.', 'The bread is fresh.', 'Do you want pizza?', 'She likes milk.', 'He eats an egg.', 'We have some fish.'],
  },
  {
    id: 'e3-1-25', subject: 'en', grade: 3, semester: 1, level: 25,
    title: 'feelings · 학교에서 쓰는 물건이 든 문장', point: '학용품',
    items: ['I have a red pen.', 'My pencil is long.', 'This is my ruler.', 'That book is mine.', 'Here is your bag.', 'I need some paper.', 'The eraser is pink.', 'Put the pen here.', 'Open your notebook.', 'Use this blue pencil.'],
  },
  {
    id: 'e3-1-26', subject: 'en', grade: 3, semester: 1, level: 26,
    title: 'colors · 인사하고 답하는 문장', point: '인사말',
    items: ['Hi, there!', 'How are you?', 'I\'m fine, thanks.', 'Good to see you.', 'Goodbye, Tom.', 'See you tomorrow.', 'I\'m good, thank you.', 'Have fun today.', 'So long, my friend.', 'Hello, everyone.'],
  },
  {
    id: 'e3-1-27', subject: 'en', grade: 3, semester: 1, level: 27,
    title: 'travel · 나를 소개하는 문장', point: 'I am',
    items: ['I am here.', 'I am a visitor.', 'I am on a boat.', 'I am in a tent.', 'I am on the bus.', 'I am lost.', 'I am tired.', 'I am on the plane.', 'I am away.', 'I am back home.'],
  },
  {
    id: 'e3-1-28', subject: 'en', grade: 3, semester: 1, level: 28,
    title: 'daily life · 무엇인지 말하는 문장', point: 'It is',
    items: ['It is a book.', 'It is my bag.', 'It is a pencil.', 'It is your desk.', 'It is a chair.', 'It is my cup.', 'It is a clock.', 'It is your bike.', 'It is a ball.', 'It is my lunch.'],
  },
  {
    id: 'e3-1-29', subject: 'en', grade: 3, semester: 1, level: 29,
    title: 'weather · 짧게 묻는 문장 (Do you like it? / Is it a cat?)', point: '짧은물음',
    items: ['Is it sunny?', 'Is it rainy?', 'Is it cloudy?', 'Is it windy?', 'Is it hot?', 'Is it cold?', 'How is the weather?', 'Is it warm?', 'Is it cool?', 'Is it snowing?'],
  },
  {
    id: 'e3-2-01', subject: 'en', grade: 3, semester: 2, level: 1,
    title: 'my town · bl·cl·fl 로 시작하는 낱말', point: '첫겹자음1',
    items: ['black', 'blue', 'block', 'clock', 'class', 'clean', 'close', 'club', 'flower', 'floor'],
  },
  {
    id: 'e3-2-02', subject: 'en', grade: 3, semester: 2, level: 2,
    title: 'feelings · st·sp·sk 로 시작하는 낱말', point: '첫겹자음2',
    items: ['scared', 'shy', 'smile', 'start', 'stop', 'stay', 'stand', 'speak', 'spell', 'skip'],
  },
  {
    id: 'e3-2-03', subject: 'en', grade: 3, semester: 2, level: 3,
    title: 'colors · nd·nt·mp 로 끝나는 낱말', point: '끝겹자음',
    items: ['hand', 'sand', 'wind', 'find', 'kind', 'paint', 'plant', 'point', 'print', 'ant'],
  },
  {
    id: 'e3-2-04', subject: 'en', grade: 3, semester: 2, level: 4,
    title: 'travel · 끝의 e 는 소리가 없다', point: '묵음e',
    items: ['bike', 'ride', 'plane', 'drive', 'take', 'home', 'come', 'time', 'five', 'nine'],
  },
  {
    id: 'e3-2-05', subject: 'en', grade: 3, semester: 2, level: 5,
    title: 'daily life · ai 와 ay 소리가 나는 낱말', point: '긴모음ai',
    items: ['day', 'play', 'stay', 'say', 'way', 'today', 'wait', 'rain', 'train', 'mail'],
  },
  {
    id: 'e3-2-06', subject: 'en', grade: 3, semester: 2, level: 6,
    title: 'weather · 요일 이름이 든 문장 (첫 글자는 큰 글자)', point: '요일',
    items: ['I run on Monday.', 'We sing on Tuesday.', 'I read on Wednesday.', 'We swim on Thursday.', 'I play on Friday.', 'We walk on Saturday.', 'I rest on Sunday.', 'Monday is a good day.', 'Tuesday is my day.', 'Wednesday is sunny.'],
  },
  {
    id: 'e3-2-07', subject: 'en', grade: 3, semester: 2, level: 7,
    title: 'the body · 달 이름이 든 문장 (첫 글자는 큰 글자)', point: '달이름',
    items: ['I play in January.', 'We run in February.', 'I sing in March.', 'We walk in April.', 'I swim in May.', 'We play in June.', 'I read in July.', 'We sing in August.', 'I run in September.', 'We walk in October.'],
  },
  {
    id: 'e3-2-08', subject: 'en', grade: 3, semester: 2, level: 8,
    title: 'school · 가족을 나타내는 낱말', point: '가족',
    items: ['mom', 'dad', 'mother', 'father', 'sister', 'family', 'baby', 'son', 'parent', 'grand'],
  },
  {
    id: 'e3-2-09', subject: 'en', grade: 3, semester: 2, level: 9,
    title: 'seasons · 몸의 부분을 나타내는 낱말', point: '몸',
    items: ['eye', 'nose', 'mouth', 'ear', 'head', 'face', 'arm', 'hand', 'leg', 'foot'],
  },
  {
    id: 'e3-2-10', subject: 'en', grade: 3, semester: 2, level: 10,
    title: 'clothes · 입는 것을 나타내는 낱말', point: '옷',
    items: ['shirt', 'pants', 'skirt', 'dress', 'socks', 'shoes', 'coat', 'jacket', 'jeans', 'shorts'],
  },
  {
    id: 'e3-2-11', subject: 'en', grade: 3, semester: 2, level: 11,
    title: 'family · 가리켜 말하는 문장', point: 'This is',
    items: ['This is my mom.', 'This is my dad.', 'This is my sister.', 'This is my brother.', 'This is my family.', 'This is my grandma.', 'This is my grandpa.', 'This is my aunt.', 'This is my uncle.', 'This is my cousin.'],
  },
  {
    id: 'e3-2-12', subject: 'en', grade: 3, semester: 2, level: 12,
    title: 'sports · 좋아하는 것을 말하는 문장', point: 'I like',
    items: ['I like baseball.', 'I like basketball.', 'I like swimming.', 'I like skating.', 'I like skiing.', 'I like running.', 'I like jumping.', 'I like badminton.', 'I like volleyball.', 'I like bowling.'],
  },
  {
    id: 'e3-2-13', subject: 'en', grade: 3, semester: 2, level: 13,
    title: 'toys · 가진 것을 말하는 문장', point: 'I have',
    items: ['I have a ball.', 'I have a doll.', 'I have a kite.', 'I have a robot.', 'I have a car.', 'I have a plane.', 'I have a train.', 'I have a boat.', 'I have a bike.', 'I have a yo-yo.'],
  },
  {
    id: 'e3-2-14', subject: 'en', grade: 3, semester: 2, level: 14,
    title: 'friends · 부탁하고 시키는 문장', point: '부탁',
    items: ['Come here, please.', 'Sit here, please.', 'Help me, please.', 'Wait for me, please.', 'Play with me, please.', 'Look at me, please.', 'Listen to me, please.', 'Call me, please.', 'Open it, please.', 'Close it, please.'],
  },
  {
    id: 'e3-2-15', subject: 'en', grade: 3, semester: 2, level: 15,
    title: 'hobbies · 짧은 문장 두루 쓰기', point: '짧은문장',
    items: ['I like music.', 'I can sing.', 'We play soccer.', 'She can dance.', 'He likes books.', 'I draw a cat.', 'Let\'s ride a bike.', 'Can you swim?', 'They play games.', 'I read every day.'],
  },
  {
    id: 'e3-2-16', subject: 'en', grade: 3, semester: 2, level: 16,
    title: 'music · bl·cl·fl 로 시작하는 낱말', point: '첫겹자음1',
    items: ['blow', 'blank', 'blind', 'clap', 'climb', 'clown', 'clip', 'click', 'flute', 'flame'],
  },
  {
    id: 'e3-2-17', subject: 'en', grade: 3, semester: 2, level: 17,
    title: 'animals · st·sp·sk 로 시작하는 낱말', point: '첫겹자음2',
    items: ['snake', 'spider', 'skunk', 'snail', 'swan', 'sheep', 'shark', 'skate', 'stork', 'slug'],
  },
  {
    id: 'e3-2-18', subject: 'en', grade: 3, semester: 2, level: 18,
    title: 'home · nd·nt·mp 로 끝나는 낱말', point: '끝겹자음',
    items: ['land', 'stand', 'friend', 'band', 'pond', 'tent', 'want', 'went', 'front', 'count'],
  },
  {
    id: 'e3-2-19', subject: 'en', grade: 3, semester: 2, level: 19,
    title: 'nature · 끝의 e 는 소리가 없다', point: '묵음e',
    items: ['like', 'make', 'cake', 'face', 'cute', 'nose', 'rose', 'white', 'blue', 'nice'],
  },
  {
    id: 'e3-2-20', subject: 'en', grade: 3, semester: 2, level: 20,
    title: 'my town · 요일 이름이 든 문장 (첫 글자는 큰 글자)', point: '요일',
    items: ['I play on Monday.', 'Tuesday is a fun day.', 'We read on Wednesday.', 'Thursday is my day.', 'It is Friday today.', 'Come on Saturday.', 'See you on Sunday!', 'On Tuesday, we sing.', 'This Wednesday is fun.', 'Sunday is a sunny day.'],
  },
  {
    id: 'e3-2-21', subject: 'en', grade: 3, semester: 2, level: 21,
    title: 'feelings · 달 이름이 든 문장 (첫 글자는 큰 글자)', point: '달이름',
    items: ['January is cold.', 'I smile in February.', 'We are happy in April.', 'May is warm and nice.', 'I feel good in June.', 'July is a fun month.', 'We are glad in August.', 'September feels nice.', 'I am happy in October.', 'I smile in December.'],
  },
  {
    id: 'e3-2-22', subject: 'en', grade: 3, semester: 2, level: 22,
    title: 'colors · 가족을 나타내는이 든 문장', point: '가족',
    items: ['I love my mom.', 'Dad can help me.', 'My mother is kind.', 'Father is at home.', 'She is my sister.', 'He is my brother.', 'Grandma can cook.', 'Grandpa likes music.', 'We are a family.', 'Meet my parents.'],
  },
  {
    id: 'e3-2-23', subject: 'en', grade: 3, semester: 2, level: 23,
    title: 'travel · 몸의 부분을 나타내는이 든 문장', point: '몸',
    items: ['Touch your head.', 'Show me your hand.', 'Raise your arm.', 'Move your leg.', 'My foot is small.', 'Wash your face.', 'Close your eyes.', 'Open your mouth.', 'This is my nose.', 'Her hair is long.'],
  },
  {
    id: 'e3-2-24', subject: 'en', grade: 3, semester: 2, level: 24,
    title: 'daily life · 입는 것을 나타내는이 든 문장', point: '옷',
    items: ['I wear a blue cap.', 'Put on your coat.', 'Her dress is pink.', 'His shirt is green.', 'These socks are new.', 'My pants are black.', 'That skirt is pretty.', 'Take off your shoes.', 'This hat is yellow.', 'Your jacket is nice.'],
  },
  {
    id: 'e3-2-25', subject: 'en', grade: 3, semester: 2, level: 25,
    title: 'weather · 가리켜 말하는 문장', point: 'This is',
    items: ['This is rain.', 'This is snow.', 'This is a cloud.', 'This is the sun.', 'This is a rainbow.', 'This is a rainy day.', 'This is a sunny day.', 'This is a cold day.', 'This is a hot day.', 'This is a warm day.'],
  },
  {
    id: 'e3-2-26', subject: 'en', grade: 3, semester: 2, level: 26,
    title: 'the body · 좋아하는 것을 말하는 문장', point: 'I like',
    items: ['I like my eyes.', 'I like my nose.', 'I like my ears.', 'I like my hair.', 'I like my hands.', 'I like my feet.', 'I like my arms.', 'I like my legs.', 'I like my face.', 'I like my smile.'],
  },
  {
    id: 'e3-2-27', subject: 'en', grade: 3, semester: 2, level: 27,
    title: 'school · 가진 것을 말하는 문장', point: 'I have',
    items: ['I have a pen.', 'I have a pencil.', 'I have a book.', 'I have a ruler.', 'I have an eraser.', 'I have a bag.', 'I have a notebook.', 'I have a crayon.', 'I have a desk.', 'I have a chair.'],
  },
  {
    id: 'e3-2-28', subject: 'en', grade: 3, semester: 2, level: 28,
    title: 'seasons · 부탁하고 시키는 문장', point: '부탁',
    items: ['Wear your coat.', 'Put on your hat.', 'Take your umbrella.', 'Drink some water.', 'Please wear a cap.', 'Let\'s go outside.', 'Come inside, please.', 'Please close the door.', 'Look at the snow.', 'Stay in the shade.'],
  },
  {
    id: 'e3-2-29', subject: 'en', grade: 3, semester: 2, level: 29,
    title: 'clothes · 짧은 문장 두루 쓰기', point: '짧은문장',
    items: ['I wear a blue shirt.', 'This coat is warm.', 'My shoes are black.', 'She has a red dress.', 'He wears a green cap.', 'These socks are white.', 'I like this skirt.', 'Are these your pants?', 'That is my scarf.', 'The boots are brown.'],
  },
  {
    id: 'e4-1-01', subject: 'en', grade: 4, semester: 1, level: 1,
    title: 'the body · ee 와 ea 소리가 나는 낱말', point: '긴모음ee',
    items: ['feet', 'heel', 'teeth', 'cheek', 'see', 'need', 'eat', 'hear', 'clean', 'reach'],
  },
  {
    id: 'e4-1-02', subject: 'en', grade: 4, semester: 1, level: 2,
    title: 'school · oa 와 ow 소리가 나는 낱말', point: '긴모음oa',
    items: ['coat', 'road', 'goal', 'coach', 'board', 'show', 'know', 'row', 'slow', 'window'],
  },
  {
    id: 'e4-1-03', subject: 'en', grade: 4, semester: 1, level: 3,
    title: 'seasons · sh 와 ch 소리가 나는 낱말', point: 'sh·ch',
    items: ['ship', 'shop', 'fish', 'dish', 'wash', 'brush', 'chin', 'chop', 'rich', 'much'],
  },
  {
    id: 'e4-1-04', subject: 'en', grade: 4, semester: 1, level: 4,
    title: 'clothes · th 와 wh 소리가 나는 낱말', point: 'th·wh',
    items: ['thin', 'thick', 'path', 'math', 'mouth', 'teeth', 'what', 'when', 'which', 'white'],
  },
  {
    id: 'e4-1-05', subject: 'en', grade: 4, semester: 1, level: 5,
    title: 'family · 여럿을 나타내는 -s 와 -es', point: '복수형',
    items: ['boys', 'girls', 'babies', 'cousins', 'parents', 'sisters', 'aunts', 'uncles', 'mothers', 'fathers'],
  },
  {
    id: 'e4-1-06', subject: 'en', grade: 4, semester: 1, level: 6,
    title: 'sports · 집과 방을 나타내는 낱말', point: '집과방',
    items: ['house', 'room', 'kitchen', 'door', 'window', 'floor', 'wall', 'roof', 'yard', 'garden'],
  },
  {
    id: 'e4-1-07', subject: 'en', grade: 4, semester: 1, level: 7,
    title: 'toys · 날씨를 나타내는 낱말', point: '날씨',
    items: ['sunny', 'rainy', 'cloudy', 'windy', 'snowy', 'hot', 'cold', 'warm', 'cool', 'foggy'],
  },
  {
    id: 'e4-1-08', subject: 'en', grade: 4, semester: 1, level: 8,
    title: 'friends · 할 수 있는 것을 말하는 문장', point: 'can문장',
    items: ['You can jump high.', 'We can play soccer.', 'He can ride a bike.', 'She can sing well.', 'They can swim together.', 'My friend can dance.', 'A boy can draw a cat.', 'A girl can read aloud.', 'Tom can throw a ball.', 'Jane can make a kite.'],
  },
  {
    id: 'e4-1-09', subject: 'en', grade: 4, semester: 1, level: 9,
    title: 'hobbies · 무엇인지 묻고 답하는 문장', point: 'What의문',
    items: ['What is your hobby?', 'What do you like to do?', 'What game do you play?', 'What sport do you like?', 'What do you draw?', 'What book do you read?', 'What song do you sing?', 'What can you make?', 'What do they play?', 'What does he like?'],
  },
  {
    id: 'e4-1-10', subject: 'en', grade: 4, semester: 1, level: 10,
    title: 'music · 몇 개인지 묻고 답하는 문장', point: 'HowMany',
    items: ['How many songs do you know?', 'How many drums do you see?', 'How many pianos are there?', 'How many bells can you hear?', 'How many notes can you read?', 'How many flutes do we have?', 'How many guitars are there?', 'How many singers do you see?', 'How many bands do you like?', 'How many dances do they know?'],
  },
  {
    id: 'e4-1-11', subject: 'en', grade: 4, semester: 1, level: 11,
    title: 'animals · 계절을 말하는 문장', point: '계절',
    items: ['It is warm in spring.', 'Birds sing in spring.', 'Bears wake up in spring.', 'I see bees in spring.', 'Rabbits play in spring.', 'Ducks swim in summer.', 'It is hot in summer.', 'Fish swim in summer.', 'Frogs jump in summer.', 'Cats sleep in summer.'],
  },
  {
    id: 'e4-1-12', subject: 'en', grade: 4, semester: 1, level: 12,
    title: 'home · 좋아하고 싫어하는 것을 말하는 문장', point: '좋아하는것',
    items: ['I like my room.', 'We like our home.', 'She likes the kitchen.', 'He likes his bed.', 'They like the living room.', 'Mom likes the garden.', 'Dad likes the big table.', 'My sister likes her chair.', 'My brother likes the yard.', 'I don\'t like this door.'],
  },
  {
    id: 'e4-1-13', subject: 'en', grade: 4, semester: 1, level: 13,
    title: 'nature · 무엇을 하는지 말하는 문장', point: '하는일',
    items: ['Birds fly in the sky.', 'Fish swim in the river.', 'Bees visit flowers.', 'The sun shines brightly.', 'Rain falls from the sky.', 'Trees grow in the forest.', 'A frog jumps by the pond.', 'Clouds move in the sky.', 'The wind moves the leaves.', 'Ants walk on the ground.'],
  },
  {
    id: 'e4-1-14', subject: 'en', grade: 4, semester: 1, level: 14,
    title: 'food · 있고 없음을 말하는 문장', point: '있고없음',
    items: ['I have some rice.', 'We have fresh milk.', 'Do you have bread?', 'She has an apple.', 'He has some soup.', 'I don\'t have juice.', 'We don\'t have eggs.', 'Does she have cake?', 'He doesn\'t have fish.', 'They have bananas.'],
  },
  {
    id: 'e4-1-15', subject: 'en', grade: 4, semester: 1, level: 15,
    title: 'my town · 두루 살펴 쓰는 문장', point: '종합',
    items: ['Go straight ahead.', 'Turn left here.', 'Where is the zoo?', 'The park is big.', 'Is it near the bus stop?', 'It is next to the bank.', 'I see the hospital.', 'Walk to the library.', 'Turn right at the bakery.', 'The store is open.'],
  },
  {
    id: 'e4-1-16', subject: 'en', grade: 4, semester: 1, level: 16,
    title: 'colors · oa 와 ow 소리가 나는 낱말', point: '긴모음oa',
    items: ['yellow', 'rainbow', 'glow', 'snow', 'low', 'grow', 'boat', 'goat', 'soap', 'toast'],
  },
  {
    id: 'e4-1-17', subject: 'en', grade: 4, semester: 1, level: 17,
    title: 'travel · sh 와 ch 소리가 나는 낱말', point: 'sh·ch',
    items: ['shoe', 'shirt', 'short', 'shine', 'fresh', 'beach', 'chair', 'cheese', 'chick', 'child'],
  },
  {
    id: 'e4-1-18', subject: 'en', grade: 4, semester: 1, level: 18,
    title: 'daily life · th 와 wh 소리가 나는 낱말', point: 'th·wh',
    items: ['this', 'that', 'these', 'those', 'they', 'them', 'then', 'there', 'why', 'who'],
  },
  {
    id: 'e4-1-19', subject: 'en', grade: 4, semester: 1, level: 19,
    title: 'weather · 여럿을 나타내는 -s 와 -es', point: '복수형',
    items: ['days', 'clouds', 'winds', 'storms', 'skies', 'drops', 'boxes', 'trees', 'flowers', 'birds'],
  },
  {
    id: 'e4-1-20', subject: 'en', grade: 4, semester: 1, level: 20,
    title: 'the body · 집과 방을 나타내는이 든 문장', point: '집과방',
    items: ['My house has a kitchen.', 'The bedroom is upstairs.', 'We eat in the dining room.', 'Come into the living room.', 'My bed is in this room.', 'The bathroom is over there.', 'Our kitchen is very clean.', 'There is a table inside.', 'Is your room next to mine?', 'Dad is in the living room.'],
  },
  {
    id: 'e4-1-21', subject: 'en', grade: 4, semester: 1, level: 21,
    title: 'school · 날씨를 나타내는이 든 문장', point: '날씨',
    items: ['It is sunny today.', 'The sky is cloudy.', 'We have a rainy day.', 'It is cold outside.', 'Today is warm and sunny.', 'The wind is very strong.', 'Look at the dark clouds.', 'Snow is falling outside.', 'Is it hot today?', 'I like cool weather.'],
  },
  {
    id: 'e4-1-22', subject: 'en', grade: 4, semester: 1, level: 22,
    title: 'seasons · 할 수 있는 것을 말하는 문장', point: 'can문장',
    items: ['I can ski in winter.', 'We can camp in summer.', 'You can see spring flowers.', 'He can fly a kite in fall.', 'She can make a snowman.', 'They can eat cold food.', 'My family can go outside.', 'A bird can sit in a tree.', 'Bees can come in spring.', 'Leaves can fall in fall.'],
  },
  {
    id: 'e4-1-23', subject: 'en', grade: 4, semester: 1, level: 23,
    title: 'clothes · 무엇인지 묻고 답하는 문장', point: 'What의문',
    items: ['What are you wearing?', 'What color is your shirt?', 'What do you wear outside?', 'What does she wear?', 'What does he have on?', 'What color are your pants?', 'What is on your head?', 'What can I wear today?', 'What is her dress like?', 'What color is his cap?'],
  },
  {
    id: 'e4-1-24', subject: 'en', grade: 4, semester: 1, level: 24,
    title: 'family · 몇 개인지 묻고 답하는 문장', point: 'HowMany',
    items: ['How many brothers do you have?', 'How many sisters do you have?', 'How many babies are there?', 'How many parents do you see?', 'How many cousins are here?', 'How many uncles do they have?', 'How many aunts can you see?', 'How many children are at home?', 'How many families live here?', 'How many sons does she have?'],
  },
  {
    id: 'e4-1-25', subject: 'en', grade: 4, semester: 1, level: 25,
    title: 'sports · 계절을 말하는 문장', point: '계절',
    items: ['We ski in winter.', 'I skate in winter.', 'They run in fall.', 'He plays soccer in fall.', 'She plays tennis in fall.', 'We play hockey in winter.', 'I jump rope in fall.', 'They play games in winter.', 'He rides a bike in fall.', 'She walks fast in winter.'],
  },
  {
    id: 'e4-1-26', subject: 'en', grade: 4, semester: 1, level: 26,
    title: 'toys · 좋아하고 싫어하는 것을 말하는 문장', point: '좋아하는것',
    items: ['I like this ball.', 'You like that kite.', 'She likes her doll.', 'He likes toy cars.', 'They like the blocks.', 'We like the robot.', 'My friend likes the train.', 'The boy likes his top.', 'The girl likes the puzzle.', 'I don\'t like that drum.'],
  },
  {
    id: 'e4-1-27', subject: 'en', grade: 4, semester: 1, level: 27,
    title: 'friends · 무엇을 하는지 말하는 문장', point: '하는일',
    items: ['I play with my friend.', 'You help your friend.', 'We study together.', 'She reads with a friend.', 'He plays ball with me.', 'They walk to school.', 'My friend draws a picture.', 'The boys play a game.', 'Two girls sing together.', 'Our friends eat lunch.'],
  },
  {
    id: 'e4-1-28', subject: 'en', grade: 4, semester: 1, level: 28,
    title: 'hobbies · 있고 없음을 말하는 문장', point: '있고없음',
    items: ['I have a fun hobby.', 'We have two kites.', 'Do you have a bike?', 'She has a new ball.', 'He has a toy plane.', 'I don\'t have a puzzle.', 'We don\'t have a game.', 'Does she have a doll?', 'He doesn\'t have a robot.', 'They have comic books.'],
  },
  {
    id: 'e4-1-29', subject: 'en', grade: 4, semester: 1, level: 29,
    title: 'music · 두루 살펴 쓰는 문장', point: '종합',
    items: ['Listen to the music.', 'She can play the piano.', 'Sing a happy song.', 'I like this drum.', 'He plays the violin well.', 'Dance to the beat.', 'This flute is loud.', 'Join the school band.', 'We practice together.', 'Hear the sweet sound.'],
  },
  {
    id: 'e4-2-01', subject: 'en', grade: 4, semester: 2, level: 1,
    title: 'clothes · ar 과 or 소리가 나는 낱말', point: 'ar·or',
    items: ['scarf', 'shorts', 'yarn', 'cord', 'warm', 'dark', 'parka', 'party', 'worn', 'charm'],
  },
  {
    id: 'e4-2-02', subject: 'en', grade: 4, semester: 2, level: 2,
    title: 'family · er·ir·ur 소리가 나는 낱말', point: 'er·ir·ur',
    items: ['mother', 'father', 'sister', 'brother', 'girl', 'bird', 'nurse', 'helper', 'person', 'older'],
  },
  {
    id: 'e4-2-03', subject: 'en', grade: 4, semester: 2, level: 3,
    title: 'friends · 일하는 사람을 나타내는 낱말', point: '직업',
    items: ['teacher', 'doctor', 'nurse', 'cook', 'farmer', 'singer', 'driver', 'pilot', 'artist', 'police'],
  },
  {
    id: 'e4-2-04', subject: 'en', grade: 4, semester: 2, level: 4,
    title: 'hobbies · 장소를 나타내는 낱말', point: '장소',
    items: ['school', 'home', 'park', 'library', 'hospital', 'museum', 'market', 'store', 'zoo', 'farm'],
  },
  {
    id: 'e4-2-05', subject: 'en', grade: 4, semester: 2, level: 5,
    title: 'music · 운동과 취미를 나타내는 낱말', point: '운동취미',
    items: ['soccer', 'baseball', 'basketball', 'tennis', 'swimming', 'running', 'skating', 'skiing', 'fishing', 'camping'],
  },
  {
    id: 'e4-2-06', subject: 'en', grade: 4, semester: 2, level: 6,
    title: 'animals · 하고 있는 일을 말하는 문장', point: '-ing문장',
    items: ['A dog is running.', 'The cat is sleeping.', 'My bird is singing.', 'That rabbit is jumping.', 'A duck is swimming.', 'The horse is eating.', 'Our cow is walking.', 'This pig is drinking.', 'One monkey is climbing.', 'Your bear is sitting.'],
  },
  {
    id: 'e4-2-07', subject: 'en', grade: 4, semester: 2, level: 7,
    title: 'home · 어디인지 묻고 답하는 문장', point: 'Where의문',
    items: ['Where is my book?', 'Where is the chair?', 'Where is your bag?', 'Where is my cup?', 'Where is the table?', 'Where is Mom?', 'Where is my bed?', 'Where is the clock?', 'Where is Dad?', 'Where is the kitchen?'],
  },
  {
    id: 'e4-2-08', subject: 'en', grade: 4, semester: 2, level: 8,
    title: 'nature · 언제인지 묻고 답하는 문장', point: 'When의문',
    items: ['When is spring?', 'When is summer?', 'When is winter?', 'When is fall?', 'When does it rain?', 'When does snow fall?', 'When do flowers grow?', 'When do birds sing?', 'When does the sun rise?', 'When do leaves fall?'],
  },
  {
    id: 'e4-2-09', subject: 'en', grade: 4, semester: 2, level: 9,
    title: 'food · 몇 시인지 말하는 문장', point: '시각',
    items: ['It\'s seven o\'clock.', 'It\'s twelve o\'clock.', 'Lunch is at one.', 'Dinner is at six.', 'Breakfast is at eight.', 'We eat at five.', 'I eat lunch at noon.', 'It\'s nine thirty.', 'Snack time is at three.', 'We have lunch at eleven.'],
  },
  {
    id: 'e4-2-10', subject: 'en', grade: 4, semester: 2, level: 10,
    title: 'my town · 어디에 있는지 말하는 문장', point: '위치',
    items: ['Go straight one block.', 'The park is over there.', 'It is behind the bank.', 'A post office is near.', 'Is it next to the zoo?', 'Turn left at the mart.', 'My school is right here.', 'The bookstore is ahead.', 'Walk two blocks down.', 'The museum is far away.'],
  },
  {
    id: 'e4-2-11', subject: 'en', grade: 4, semester: 2, level: 11,
    title: 'colors · 하루 일을 말하는 문장', point: '하루일과',
    items: ['I put on a red shirt.', 'She draws with blue ink.', 'Brush with a pink cup.', 'He rides a yellow bike.', 'We read the green book.', 'Wash your white socks.', 'Find my orange cap today.', 'Eat a sweet purple grape.', 'They take brown shoes.', 'Paint the gray fence now.'],
  },
  {
    id: 'e4-2-12', subject: 'en', grade: 4, semester: 2, level: 12,
    title: 'travel · 두루 살펴 쓰는 문장', point: '종합',
    items: ['I pack my red bag.', 'We go to the beach.', 'Take a bus together.', 'Where is your ticket?', 'He rides a blue train.', 'Let\'s visit my grandma.', 'They stay at a hotel.', 'She wants to travel.', 'Walk along the street.', 'Look at the big plane.'],
  },
  {
    id: 'e4-2-13', subject: 'en', grade: 4, semester: 2, level: 13,
    title: 'daily life · ar 과 or 소리가 나는 낱말', point: 'ar·or',
    items: ['morning', 'alarm', 'start', 'fork', 'chore', 'yard', 'market', 'order', 'card', 'corn'],
  },
  {
    id: 'e4-2-14', subject: 'en', grade: 4, semester: 2, level: 14,
    title: 'weather · er·ir·ur 소리가 나는 낱말', point: 'er·ir·ur',
    items: ['winter', 'summer', 'thunder', 'shower', 'turn', 'shiver', 'burn', 'water', 'river', 'hurt'],
  },
  {
    id: 'e4-2-15', subject: 'en', grade: 4, semester: 2, level: 15,
    title: 'the body · 소리 나지 않는 k 와 w 가 든 낱말', point: '묵음kw',
    items: ['knee', 'wrist', 'knuckle', 'knelt', 'wrinkle', 'walk', 'two', 'knew', 'knife', 'wrote'],
  },
  {
    id: 'e4-2-16', subject: 'en', grade: 4, semester: 2, level: 16,
    title: 'school · 소리 나지 않는 b 와 l 이 든 낱말', point: '묵음bl',
    items: ['could', 'would', 'should', 'folk', 'yolk', 'tomb', 'climber', 'climbing', 'thumbs', 'walked'],
  },
  {
    id: 'e4-2-17', subject: 'en', grade: 4, semester: 2, level: 17,
    title: 'seasons · 일하는 사람을 나타내는이 든 문장', point: '직업',
    items: ['My dad is a cook.', 'She wants to be a doctor.', 'The farmer grows food.', 'A teacher helps students.', 'He works as a police officer.', 'The nurse helps sick people.', 'Her mom is a bus driver.', 'I want to be a singer.', 'That man is a firefighter.', 'The baker makes good bread.'],
  },
  {
    id: 'e4-2-18', subject: 'en', grade: 4, semester: 2, level: 18,
    title: 'clothes · 장소를 나타내는이 든 문장', point: '장소',
    items: ['I am at the library.', 'She goes to the park.', 'Meet me at the school.', 'The bank is over there.', 'We play at the playground.', 'He is in the classroom.', 'Is the store near here?', 'Go straight to the hospital.', 'They walk to the station.', 'The restaurant is nearby.'],
  },
  {
    id: 'e4-2-19', subject: 'en', grade: 4, semester: 2, level: 19,
    title: 'family · 운동과 취미를 나타내는이 든 문장', point: '운동취미',
    items: ['I like playing soccer.', 'She can play baseball.', 'We play basketball today.', 'He enjoys riding a bike.', 'Do you like swimming?', 'My hobby is drawing.', 'They play badminton well.', 'Let\'s go hiking together.', 'Reading books is my hobby.', 'Can you play table tennis?'],
  },
  {
    id: 'e4-2-20', subject: 'en', grade: 4, semester: 2, level: 20,
    title: 'sports · 하고 있는 일을 말하는 문장', point: '-ing문장',
    items: ['She is skiing.', 'He is kicking a ball.', 'We are playing soccer.', 'They are riding bikes.', 'My friend is bowling.', 'Tom is playing tennis.', 'Jane is catching a ball.', 'You are throwing a ball.', 'Sam is playing baseball.', 'Amy is dancing now.'],
  },
  {
    id: 'e4-2-21', subject: 'en', grade: 4, semester: 2, level: 21,
    title: 'toys · 어디인지 묻고 답하는 문장', point: 'Where의문',
    items: ['Where is my ball?', 'Where is the robot?', 'Where is your doll?', 'Where is my kite?', 'Where is the toy car?', 'Where is your bike?', 'Where is the box?', 'Where is my bear?', 'Where is the train?', 'Where is your plane?'],
  },
  {
    id: 'e4-2-22', subject: 'en', grade: 4, semester: 2, level: 22,
    title: 'friends · 언제인지 묻고 답하는 문장', point: 'When의문',
    items: ['When is your birthday?', 'When is the party?', 'When do we meet?', 'When can you play?', 'When can she come?', 'When can he visit?', 'When is our game?', 'When is your class?', 'When do you go home?', 'When can we talk?'],
  },
  {
    id: 'e4-2-23', subject: 'en', grade: 4, semester: 2, level: 23,
    title: 'hobbies · 몇 시인지 말하는 문장', point: '시각',
    items: ['It\'s two o\'clock.', 'It\'s four o\'clock.', 'It\'s five thirty.', 'Soccer starts at three.', 'I swim at four thirty.', 'We play at two.', 'I read at eight.', 'Dance class is at five.', 'I skate at nine.', 'Music starts at ten.'],
  },
  {
    id: 'e4-2-24', subject: 'en', grade: 4, semester: 2, level: 24,
    title: 'music · 어디에 있는지 말하는 문장', point: '위치',
    items: ['The drum is on the stage.', 'Put the flute in the box.', 'The piano is by the door.', 'Where is my violin?', 'The guitar is under the bed.', 'Look inside the music room.', 'Your bell is near the wall.', 'A trumpet is on that chair.', 'Her recorder is in the bag.', 'Find the horn near the desk.'],
  },
  {
    id: 'e4-2-25', subject: 'en', grade: 4, semester: 2, level: 25,
    title: 'animals · 길을 묻고 알려 주는 문장', point: '길묻기',
    items: ['Where can I see the bear?', 'Go down one block.', 'Turn right at the big tree.', 'Find the cat hospital.', 'Walk past the brown dog.', 'How can we reach the zoo?', 'Turn left by the horse.', 'It is next to the pig farm.', 'Look behind the cow shed.', 'The rabbit shop is ahead.'],
  },
  {
    id: 'e4-2-26', subject: 'en', grade: 4, semester: 2, level: 26,
    title: 'home · 하루 일을 말하는 문장', point: '하루일과',
    items: ['Wake up in my room.', 'Make the bed every morning.', 'Cook breakfast at home.', 'Help dad clean the floor.', 'Do homework by the desk.', 'Wash dishes in the sink.', 'Feed my small pet inside.', 'Watch TV on the sofa.', 'Take a rest after lunch.', 'Open all the windows.'],
  },
  {
    id: 'e4-2-27', subject: 'en', grade: 4, semester: 2, level: 27,
    title: 'nature · 두루 살펴 쓰는 문장', point: '종합',
    items: ['Look at that tall tree.', 'Leaves fall in autumn.', 'Rain falls from clouds.', 'The deep river flows.', 'Smell the sweet flower.', 'Birds sing on the hill.', 'We walk in the forest.', 'Wind blows softly here.', 'Watch the night stars.', 'A frog lives in water.'],
  },
  {
    id: 'e5-1-01', subject: 'en', grade: 5, semester: 1, level: 1,
    title: 'music · oo 가 내는 두 가지 소리', point: 'oo두소리',
    items: ['moon', 'room', 'food', 'school', 'cool', 'pool', 'soon', 'zoo', 'tooth', 'spoon'],
  },
  {
    id: 'e5-1-02', subject: 'en', grade: 5, semester: 1, level: 2,
    title: 'animals · ou 와 ow 소리가 나는 낱말', point: 'ou·ow',
    items: ['out', 'house', 'mouse', 'mouth', 'round', 'sound', 'cloud', 'ground', 'found', 'loud'],
  },
  {
    id: 'e5-1-03', subject: 'en', grade: 5, semester: 1, level: 3,
    title: 'home · oi 와 oy 소리가 나는 낱말', point: 'oi·oy',
    items: ['oil', 'coin', 'point', 'join', 'voice', 'noise', 'boil', 'soil', 'toilet', 'choice'],
  },
  {
    id: 'e5-1-04', subject: 'en', grade: 5, semester: 1, level: 4,
    title: 'nature · 자음을 겹쳐 쓰는 낱말', point: '겹자음규칙',
    items: ['summer', 'sunny', 'rabbit', 'apple', 'happy', 'yellow', 'butter', 'little', 'grass', 'cherry'],
  },
  {
    id: 'e5-1-05', subject: 'en', grade: 5, semester: 1, level: 5,
    title: 'food · -le 과 -el 로 끝나는 낱말', point: '-le끝',
    items: ['apple', 'noodle', 'pickle', 'waffle', 'popsicle', 'pineapple', 'vegetable', 'bottle', 'table', 'kettle'],
  },
  {
    id: 'e5-1-06', subject: 'en', grade: 5, semester: 1, level: 6,
    title: 'my town · 마음을 나타내는 낱말', point: '감정',
    items: ['happy', 'sad', 'angry', 'afraid', 'glad', 'sorry', 'worried', 'excited', 'surprised', 'proud'],
  },
  {
    id: 'e5-1-07', subject: 'en', grade: 5, semester: 1, level: 7,
    title: 'feelings · 자연을 나타내는 낱말', point: '자연',
    items: ['forest', 'mountain', 'river', 'ocean', 'island', 'beach', 'sky', 'cloud', 'rain', 'snow'],
  },
  {
    id: 'e5-1-08', subject: 'en', grade: 5, semester: 1, level: 8,
    title: 'colors · 지난 일을 말하는 문장', point: '과거형ed',
    items: ['I painted a blue box.', 'She mixed red and white.', 'We colored the green tree.', 'He liked the yellow cap.', 'They picked purple flowers.', 'My sister changed the orange dress.', 'The painter used bright pink.', 'Mom matched brown shoes.', 'Everyone loved the gray cat.', 'You rolled a black ball.'],
  },
  {
    id: 'e5-1-09', subject: 'en', grade: 5, semester: 1, level: 9,
    title: 'travel · 소리가 같고 뜻이 다른 낱말이 든 문장', point: '동음이의',
    items: ['We can see the blue sea today.', 'Did you buy a ticket by the gate?', 'Two girls want to visit the town, too.', 'He ate eight sweet apples on the bus.', 'They will meet by the meat shop.', 'She rode along the wide dirt road.', 'I hear no train sounds from here.', 'Our family had a nice one-hour trip.', 'Can you write down the right address?', 'We took a new plane to a plain hill.'],
  },
  {
    id: 'e5-1-10', subject: 'en', grade: 5, semester: 1, level: 10,
    title: 'daily life · 부탁하고 허락하는 문장', point: '부탁허락',
    items: ['Can I borrow your pencil, please?', 'Sure, you can use my notebook.', 'May I wash my hands now?', 'Please open the classroom door.', 'Could you help me clean this desk?', 'Yes, you may watch television.', 'Would you turn off the light?', 'Of course, take a short rest.', 'Can you feed the cute dog today?', 'No, you cannot play outside now.'],
  },
  {
    id: 'e5-1-11', subject: 'en', grade: 5, semester: 1, level: 11,
    title: 'weather · 둘을 견주어 말하는 문장', point: '비교하기',
    items: ['It is warmer today.', 'Summer is hotter than spring.', 'Today is cooler than yesterday.', 'This winter is colder.', 'The wind is stronger now.', 'Is it sunnier over here?', 'Which day is cloudier?', 'Today feels drier than usual.', 'The night is darker today.', 'This room is brighter now.'],
  },
  {
    id: 'e5-1-12', subject: 'en', grade: 5, semester: 1, level: 12,
    title: 'school · 함께 하자고 말하는 문장', point: '권유하기',
    items: ['Let\'s read books in the library.', 'Shall we walk to the classroom?', 'Why don\'t we do our homework?', 'How about asking the teacher?', 'What about having lunch together?', 'Would you like to visit my school?', 'Let us clean the wide art room.', 'Can we play soccer in the gym?', 'Why not practice science today?', 'Shall we study English now?'],
  },
  {
    id: 'e5-1-13', subject: 'en', grade: 5, semester: 1, level: 13,
    title: 'seasons · 겪은 일을 말하는 문장', point: '경험말하기',
    items: ['I planted flowers in spring.', 'We swam at the pool last summer.', 'He picked apples this fall.', 'She made a snowman in winter.', 'They ate watermelon yesterday.', 'My dad cleaned leaves outside.', 'Did you feel warm winds?', 'We drank hot tea together.', 'It snowed heavily on Monday.', 'I saw yellow leaves fall down.'],
  },
  {
    id: 'e5-1-14', subject: 'en', grade: 5, semester: 1, level: 14,
    title: 'clothes · 두루 살펴 쓰는 문장', point: '종합',
    items: ['Put on your warm jacket.', 'This blue shirt is too big.', 'Whose yellow cap is that?', 'She wants to wear a skirt.', 'Hang your coat in the closet.', 'These brown boots are nice.', 'Try on that green sweater.', 'Where did you buy the socks?', 'His black pants look neat.', 'I need a red winter scarf.'],
  },
  {
    id: 'e5-1-15', subject: 'en', grade: 5, semester: 1, level: 15,
    title: 'family · oo 가 내는 두 가지 소리', point: 'oo두소리',
    items: ['foot', 'good', 'wood', 'wool', 'hood', 'hook', 'took', 'stood', 'noon', 'boot'],
  },
  {
    id: 'e5-1-16', subject: 'en', grade: 5, semester: 1, level: 16,
    title: 'sports · ou 와 ow 소리가 나는 낱말', point: 'ou·ow',
    items: ['cow', 'how', 'now', 'down', 'town', 'brown', 'flower', 'shower', 'crowd', 'around'],
  },
  {
    id: 'e5-1-17', subject: 'en', grade: 5, semester: 1, level: 17,
    title: 'toys · oi 와 oy 소리가 나는 낱말', point: 'oi·oy',
    items: ['toy', 'boy', 'joy', 'enjoy', 'royal', 'loyal', 'oyster', 'destroy', 'annoy', 'cowboy'],
  },
  {
    id: 'e5-1-18', subject: 'en', grade: 5, semester: 1, level: 18,
    title: 'friends · 자음을 겹쳐 쓰는 낱말', point: '겹자음규칙',
    items: ['letter', 'tennis', 'dinner', 'coffee', 'soccer', 'puppy', 'kitten', 'running', 'swimming', 'sitting'],
  },
  {
    id: 'e5-1-19', subject: 'en', grade: 5, semester: 1, level: 19,
    title: 'hobbies · -le 과 -el 로 끝나는 낱말', point: '-le끝',
    items: ['puzzle', 'cycle', 'marble', 'doodle', 'juggle', 'paddle', 'whistle', 'needle', 'circle', 'candle'],
  },
  {
    id: 'e5-1-20', subject: 'en', grade: 5, semester: 1, level: 20,
    title: 'music · 마음을 나타내는이 든 문장', point: '감정',
    items: ['This song makes me happy.', 'I feel calm with music.', 'Her song makes us smile.', 'We are excited to sing.', 'Music makes my heart warm.', 'That song sounds sad to me.', 'I am glad to hear this song.', 'Singing makes him feel good.', 'The music makes her excited.', 'We feel happy when we sing.'],
  },
  {
    id: 'e5-1-21', subject: 'en', grade: 5, semester: 1, level: 21,
    title: 'animals · 자연을 나타내는이 든 문장', point: '자연',
    items: ['A rabbit runs in the field.', 'Birds sing in the green trees.', 'A frog jumps by the river.', 'The bear walks in the forest.', 'Fish swim under the water.', 'A butterfly sits on a flower.', 'The duck swims across the lake.', 'Bees fly around the flowers.', 'A fox lives near the mountain.', 'The turtle rests by the pond.'],
  },
  {
    id: 'e5-1-22', subject: 'en', grade: 5, semester: 1, level: 22,
    title: 'home · 지난 일을 말하는 문장', point: '과거형ed',
    items: ['I cleaned my small room.', 'Dad cooked dinner at home.', 'She opened the front door.', 'We washed dirty dishes.', 'He closed the living room window.', 'Grandma rested on the soft sofa.', 'My brother planted seeds in the yard.', 'They watched television together.', 'The cute puppy jumped on the bed.', 'Mom fixed the broken chair.'],
  },
  {
    id: 'e5-1-23', subject: 'en', grade: 5, semester: 1, level: 23,
    title: 'nature · 소리가 같고 뜻이 다른 낱말이 든 문장', point: '동음이의',
    items: ['A brown hare has soft white hair.', 'The big black bear has bare feet.', 'I can hear small birds right here.', 'A sunny day brings our bright sun.', 'There is their wooden house in nature.', 'Fresh green pear trees grow in a pair.', 'Leaves fall through the whole hole.', 'Deer ran to my dear old garden.', 'Night brings a brave, shining knight.', 'Sweet flower honey comes from flour.'],
  },
  {
    id: 'e5-1-24', subject: 'en', grade: 5, semester: 1, level: 24,
    title: 'food · 부탁하고 허락하는 문장', point: '부탁허락',
    items: ['Can I have some warm milk, please?', 'Sure, try this sweet red apple.', 'May I eat another piece of cake?', 'Please pass the salt and pepper.', 'Could you cut the fresh bread?', 'Yes, you may drink cold juice.', 'Would you bring four clean forks?', 'Of course, enjoy your hot soup.', 'No, do not touch the spicy pizza.', 'May I choose lunch from the menu?'],
  },
  {
    id: 'e5-1-25', subject: 'en', grade: 5, semester: 1, level: 25,
    title: 'my town · 둘을 견주어 말하는 문장', point: '비교하기',
    items: ['The park is bigger than the yard.', 'My school is closer than yours.', 'This street is wider.', 'Our library is quieter.', 'Their town is smaller than ours.', 'The hill is higher than that tree.', 'That store is newer than this one.', 'Which bridge is longer?', 'His house is taller than mine.', 'A bus is faster than a bike.'],
  },
  {
    id: 'e5-1-26', subject: 'en', grade: 5, semester: 1, level: 26,
    title: 'feelings · 까닭을 말하는 문장', point: '이유말하기',
    items: ['They smile because they feel happy.', 'Why are you looking so upset today?', 'He cries because he feels very sad.', 'We shout because we are excited.', 'She stays inside because she is scared.', 'I jump up because of pure joy.', 'The boy sleeps because he is tired.', 'Why is the little child angry now?', 'Cheer loudly because we are proud.', 'She feels lonely because nobody came.'],
  },
  {
    id: 'e5-1-27', subject: 'en', grade: 5, semester: 1, level: 27,
    title: 'colors · 함께 하자고 말하는 문장', point: '권유하기',
    items: ['Let\'s paint with bright colors.', 'Shall we choose the blue paper?', 'Why don\'t we use red crayons?', 'How about mixing yellow and green?', 'What about drawing a purple sky?', 'Would you like some orange juice?', 'Let us make a black mask.', 'Can we wear pink shirts today?', 'Why not buy a brown ribbon?', 'Shall we find gray stones?'],
  },
  {
    id: 'e5-1-28', subject: 'en', grade: 5, semester: 1, level: 28,
    title: 'travel · 겪은 일을 말하는 문장', point: '경험말하기',
    items: ['I visited my grandpa last week.', 'We stayed at a quiet hotel.', 'He bought tickets for the train.', 'She packed her small bag early.', 'They took pictures near the lake.', 'My family rode a tour bus.', 'Did you enjoy your long trip?', 'We climbed a tall mountain.', 'The airplane arrived on time.', 'Uncle went camping in the woods.'],
  },
  {
    id: 'e5-1-29', subject: 'en', grade: 5, semester: 1, level: 29,
    title: 'daily life · 두루 살펴 쓰는 문장', point: '종합',
    items: ['I wake up early every day.', 'Brush your teeth after meals.', 'He eats breakfast at seven.', 'We walk to school together.', 'She does her homework now.', 'Wash your hands before lunch.', 'They play soccer after class.', 'My brother feeds the puppy.', 'I read books in the evening.', 'Help your dad clean the room.'],
  },
  {
    id: 'e5-2-01', subject: 'en', grade: 5, semester: 2, level: 1,
    title: 'food · y 가 i 로 바뀌는 낱말', point: 'y→ies',
    items: ['berries', 'candies', 'cherries', 'fries', 'jellies', 'bakeries', 'groceries', 'cookies', 'spices', 'carries'],
  },
  {
    id: 'e5-2-02', subject: 'en', grade: 5, semester: 2, level: 2,
    title: 'my town · 소리 나지 않는 gh 가 든 낱말', point: '묵음gh',
    items: ['light', 'night', 'right', 'bright', 'sight', 'flight', 'straight', 'traffic', 'bought', 'brought'],
  },
  {
    id: 'e5-2-03', subject: 'en', grade: 5, semester: 2, level: 3,
    title: 'feelings · 소리 나지 않는 t 와 h 가 든 낱말', point: '묵음th',
    items: ['listen', 'often', 'fasten', 'soften', 'castle', 'whistle', 'wrestle', 'bustle', 'rustle', 'honest'],
  },
  {
    id: 'e5-2-04', subject: 'en', grade: 5, semester: 2, level: 4,
    title: 'colors · it\'s·don\'t 처럼 줄여 쓴 낱말', point: '축약형',
    items: ['it\'s', 'don\'t', 'can\'t', 'you\'re', 'he\'s', 'she\'s', 'we\'re', 'they\'re', 'isn\'t', 'aren\'t'],
  },
  {
    id: 'e5-2-05', subject: 'en', grade: 5, semester: 2, level: 5,
    title: 'travel · 뜻이 반대인 낱말', point: '반대말',
    items: ['fast', 'slow', 'early', 'late', 'far', 'near', 'cheap', 'expensive', 'safe', 'dangerous'],
  },
  {
    id: 'e5-2-06', subject: 'en', grade: 5, semester: 2, level: 6,
    title: 'daily life · 철자를 자주 틀리는 낱말', point: '자주틀리는말',
    items: ['busy', 'quiet', 'friend', 'o\'clock', 'climb', 'listen', 'write', 'brush', 'watch', 'study'],
  },
  {
    id: 'e5-2-07', subject: 'en', grade: 5, semester: 2, level: 7,
    title: 'weather · -er 로 견주는 문장', point: '비교급',
    items: ['Today is colder than yesterday.', 'It becomes darker outside.', 'The sky looks clearer today.', 'Tomorrow will be warmer.', 'Winter nights are longer.', 'Spring days are brighter.', 'The air feels cooler here.', 'This winter feels drier.', 'The rain gets heavier soon.', 'Fall weather is nicer.'],
  },
  {
    id: 'e5-2-08', subject: 'en', grade: 5, semester: 2, level: 8,
    title: 'the body · -est 로 가장 어떠한지 말하는 문장', point: '최상급',
    items: ['He has the longest arms.', 'My left foot is the biggest.', 'Her hair is the darkest.', 'You have the strongest legs.', 'This is the shortest finger.', 'The baby has the smallest nose.', 'His neck looks the thickest.', 'She has the widest smile.', 'My right hand is the warmest.', 'His face turned the reddest.'],
  },
  {
    id: 'e5-2-09', subject: 'en', grade: 5, semester: 2, level: 9,
    title: 'seasons · 왜인지 묻고 답하는 문장', point: 'Why의문',
    items: ['Why do you like spring?', 'Because warm flowers bloom.', 'Why is summer your favorite?', 'I can swim in the cool river.', 'Why does he love fall days?', 'Because sweet apples are ripe.', 'Why do they wait for winter?', 'We want to build a snowman.', 'Why are you putting on a coat?', 'Why does she smile today?'],
  },
  {
    id: 'e5-2-10', subject: 'en', grade: 5, semester: 2, level: 10,
    title: 'clothes · 어떻게인지 묻고 답하는 문장', point: 'How의문',
    items: ['How is this shirt?', 'How is your new cap?', 'How do you like my coat?', 'How is the blue dress?', 'How do these shoes look?', 'How is that yellow skirt?', 'How do you like this jacket?', 'How does my hat look?', 'How is your green sweater?', 'How do you like these pants?'],
  },
  {
    id: 'e5-2-11', subject: 'en', grade: 5, semester: 2, level: 11,
    title: 'family · 하루 일을 차례로 말하는 문장', point: '일과말하기',
    items: ['First, I eat with my family.', 'Then, I help my mother cook.', 'Next, my brother washes dishes.', 'After that, we clean the house.', 'Later, my sister feeds the dog.', 'Before dinner, Dad comes home.', 'After dinner, we talk together.', 'In the evening, Mom reads a book.', 'At night, I play with my brother.', 'Before bed, we brush our teeth.'],
  },
  {
    id: 'e5-2-12', subject: 'en', grade: 5, semester: 2, level: 12,
    title: 'sports · 앞으로 할 일을 말하는 문장', point: '계획말하기',
    items: ['I will play soccer tomorrow.', 'We will practice baseball after school.', 'I\'m going to swim this weekend.', 'My team will play basketball soon.', 'I\'ll ride my bike in the afternoon.', 'We\'re going to run in the park.', 'Next week, I will play badminton.', 'After lunch, we\'ll play table tennis.', 'On Saturday, I will practice skating.', 'Tomorrow, we\'ll jump rope together.'],
  },
  {
    id: 'e5-2-13', subject: 'en', grade: 5, semester: 2, level: 13,
    title: 'toys · 두루 살펴 쓰는 문장', point: '종합',
    items: ['Put this teddy bear into the box.', 'Look at that cute toy plane!', 'I like playing with wooden blocks.', 'Do you want to share your doll?', 'Can he fix the broken robot car?', 'Where did you buy that green puzzle?', 'Fly the colorful kite outside.', 'This game is very exciting to me.', 'Whose little puppet is on the chair?', 'We love making paper airplanes.'],
  },
  {
    id: 'e5-2-14', subject: 'en', grade: 5, semester: 2, level: 14,
    title: 'friends · ie 와 ei 를 가려 쓰는 낱말', point: 'ie·ei',
    items: ['friend', 'thief', 'niece', 'brief', 'tie', 'pie', 'shield', 'neighbor', 'weight', 'receive'],
  },
  {
    id: 'e5-2-15', subject: 'en', grade: 5, semester: 2, level: 15,
    title: 'hobbies · y 가 i 로 바뀌는 낱말', point: 'y→ies',
    items: ['stories', 'parties', 'hobbies', 'activities', 'diaries', 'countries', 'cities', 'families', 'babies', 'puppies'],
  },
  {
    id: 'e5-2-16', subject: 'en', grade: 5, semester: 2, level: 16,
    title: 'music · 소리 나지 않는 gh 가 든 낱말', point: '묵음gh',
    items: ['tonight', 'might', 'tight', 'sigh', 'thigh', 'fight', 'height', 'eight', 'enough', 'though'],
  },
  {
    id: 'e5-2-17', subject: 'en', grade: 5, semester: 2, level: 17,
    title: 'animals · 소리 나지 않는 t 와 h 가 든 낱말', point: '묵음th',
    items: ['rhino', 'white', 'whale', 'wheat', 'wheel', 'whip', 'which', 'where', 'what', 'when'],
  },
  {
    id: 'e5-2-18', subject: 'en', grade: 5, semester: 2, level: 18,
    title: 'home · it\'s·don\'t 처럼 줄여 쓴 낱말', point: '축약형',
    items: ['that\'s', 'what\'s', 'there\'s', 'let\'s', 'i\'ll', 'you\'ll', 'he\'ll', 'she\'ll', 'we\'ll', 'they\'ll'],
  },
  {
    id: 'e5-2-19', subject: 'en', grade: 5, semester: 2, level: 19,
    title: 'food · 철자를 자주 틀리는 낱말', point: '자주틀리는말',
    items: ['bread', 'juice', 'fruit', 'sugar', 'cheese', 'tomato', 'potato', 'onion', 'butter', 'carrot'],
  },
  {
    id: 'e5-2-20', subject: 'en', grade: 5, semester: 2, level: 20,
    title: 'my town · -er 로 견주는 문장', point: '비교급',
    items: ['My town is smaller than yours.', 'The library is taller than my house.', 'This park is cleaner than that one.', 'Our new bridge is wider.', 'The market is busier on Sundays.', 'That tower is higher than the school.', 'Main Street is safer for kids.', 'The village road looks older.', 'This hill is steeper to climb.', 'The bus station is nearer now.'],
  },
  {
    id: 'e5-2-21', subject: 'en', grade: 5, semester: 2, level: 21,
    title: 'feelings · -est 로 가장 어떠한지 말하는 문장', point: '최상급',
    items: ['Today was the happiest day.', 'I felt the proudest today.', 'She is the bravest girl.', 'This was the saddest movie.', 'He looked the angriest then.', 'We were the calmest here.', 'The baby was the sweetest.', 'That boy seems the boldest.', 'You looked the fittest now.', 'He became the maddest friend.'],
  },
  {
    id: 'e5-2-22', subject: 'en', grade: 5, semester: 2, level: 22,
    title: 'colors · 누구인지 묻고 답하는 문장', point: 'Who의문',
    items: ['Who is wearing a red cap?', 'She has a bright yellow bag.', 'Who likes the green shirt?', 'The boy in blue shoes is Tim.', 'Who is holding purple paint?', 'He chooses the orange crayon.', 'Who painted this pink flower?', 'Who has brown hair today?', 'My brother wears black pants.', 'Who bought the colorful coat?'],
  },
  {
    id: 'e5-2-23', subject: 'en', grade: 5, semester: 2, level: 23,
    title: 'travel · 왜인지 묻고 답하는 문장', point: 'Why의문',
    items: ['Why do you visit the island?', 'Because I want to see the sea.', 'Why are we packing our bags?', 'Let\'s take a train to the camp.', 'Why does he go to the museum?', 'He loves seeing old airplanes.', 'Why do they ride the bus now?', 'We need to reach the airport.', 'Why is she buying a big tent?', 'Because my family goes camping.'],
  },
  {
    id: 'e5-2-24', subject: 'en', grade: 5, semester: 2, level: 24,
    title: 'daily life · 어떻게인지 묻고 답하는 문장', point: 'How의문',
    items: ['How do you go to school?', 'How do you make breakfast?', 'How do you clean your room?', 'How do you get home?', 'How do you help your family?', 'How do you study English?', 'How do you spend your weekend?', 'How do you start your day?', 'How do you wash your hands?', 'How do you make your bed?'],
  },
  {
    id: 'e5-2-25', subject: 'en', grade: 5, semester: 2, level: 25,
    title: 'weather · 하루 일을 차례로 말하는 문장', point: '일과말하기',
    items: ['Early today, the sun is bright.', 'Soon, clouds come into the sky.', 'By noon, the weather gets warm.', 'This afternoon, the wind blows hard.', 'A little later, rain starts to fall.', 'Toward evening, the air gets cool.', 'As it gets dark, they return inside.', 'On a sunny morning, birds sing.', 'During a hot day, kids drink water.', 'On a cold evening, people wear coats.'],
  },
  {
    id: 'e5-2-26', subject: 'en', grade: 5, semester: 2, level: 26,
    title: 'the body · 앞으로 할 일을 말하는 문장', point: '계획말하기',
    items: ['I will wash my hands before dinner.', 'I\'m going to brush my teeth tonight.', 'Tomorrow, I will exercise my legs.', 'I\'ll rest my eyes after reading.', 'We will stretch our arms in class.', 'I\'m going to wash my face soon.', 'Later, I will comb my hair.', 'After breakfast, I\'ll clean my ears.', 'Tonight, I will take care of my feet.', 'Soon, we\'ll move our shoulders slowly.'],
  },
  {
    id: 'e5-2-27', subject: 'en', grade: 5, semester: 2, level: 27,
    title: 'school · 두루 살펴 쓰는 문장', point: '종합',
    items: ['Open your English textbook now.', 'Our classroom is on the third floor.', 'Did you finish the science report?', 'Meet me in the school cafeteria.', 'She borrows books from the library.', 'Write your name with a sharp pencil.', 'Clean the black desk with a wet cloth.', 'Where did they keep the jump ropes?', 'We have art and music every Friday.', 'Don\'t run fast in the hallway!'],
  },
  {
    id: 'e6-1-01', subject: 'en', grade: 6, semester: 1, level: 1,
    title: 'daily life · -tion 과 -sion 으로 끝나는 낱말', point: '-tion',
    items: ['action', 'station', 'question', 'vacation', 'attention', 'direction', 'education', 'mention', 'section', 'condition'],
  },
  {
    id: 'e6-1-02', subject: 'en', grade: 6, semester: 1, level: 2,
    title: 'weather · un- 과 re- 가 붙은 낱말', point: '접두사',
    items: ['unhappy', 'unusual', 'unknown', 'unwell', 'unfair', 'unsafe', 'unlike', 'untrue', 'rewrite', 'replay'],
  },
  {
    id: 'e6-1-03', subject: 'en', grade: 6, semester: 1, level: 3,
    title: 'school · 음절이 여럿인 긴 낱말', point: '긴낱말',
    items: ['classroom', 'student', 'teacher', 'notebook', 'pencil', 'eraser', 'library', 'computer', 'calendar', 'homework'],
  },
  {
    id: 'e6-1-04', subject: 'en', grade: 6, semester: 1, level: 4,
    title: 'seasons · 모양이 바뀌는 지난 일 낱말', point: '불규칙과거',
    items: ['fell', 'blew', 'froze', 'grew', 'shone', 'wore', 'swam', 'felt', 'began', 'brought'],
  },
  {
    id: 'e6-1-05', subject: 'en', grade: 6, semester: 1, level: 5,
    title: 'clothes · 모양이 바뀌는 지난 일을 말하는 문장', point: '불규칙과거문장',
    items: ['I wore a warm jacket yesterday.', 'She put on her blue winter coat.', 'Mom bought a pretty dress for me.', 'He chose brown shoes this morning.', 'They found my lost yellow socks.', 'My sister took off her wet boots.', 'I tore my pants during the game.', 'Dad hung his nice shirt in the room.', 'She blew snow off her warm mittens.', 'We made funny paper hats together.'],
  },
  {
    id: 'e6-1-06', subject: 'en', grade: 6, semester: 1, level: 6,
    title: 'family · 앞으로 할 일을 말하는 문장', point: 'will문장',
    items: ['I will help my mom today.', 'My dad will cook dinner tonight.', 'We will visit my grandma tomorrow.', 'My sister will clean her room later.', 'Our family will eat lunch together.', 'My brother will play with me after school.', 'I will call my grandpa this evening.', 'Mom will read a book with my sister.', 'Dad will take us to the park tomorrow.', 'We will make a cake for my brother.'],
  },
  {
    id: 'e6-1-07', subject: 'en', grade: 6, semester: 1, level: 7,
    title: 'sports · 하려고 하는 일을 말하는 문장', point: 'begoingto',
    items: ['I am going to play soccer.', 'We are going to practice baseball.', 'He is going to ride his bike.', 'She is going to learn tennis.', 'They are going to watch a basketball game.', 'My brother is going to swim today.', 'Our team is going to win the game.', 'The boys are going to play badminton.', 'The girls are going to jump rope.', 'My friend is going to try table tennis.'],
  },
  {
    id: 'e6-1-08', subject: 'en', grade: 6, semester: 1, level: 8,
    title: 'toys · and·but·because 로 이은 문장', point: '이어주는말',
    items: ['I like the doll because it is cute.', 'The robot is small but it can move.', 'I have a ball and my brother has a kite.', 'This train is old but I still like it.', 'She wants the blocks because they are fun.', 'My toy car is red and it runs fast.', 'He likes the plane but he wants the boat.', 'We play with cards because they are easy.', 'That bear is soft and it has big eyes.', 'The puzzle is hard but I want to try it.'],
  },
  {
    id: 'e6-1-09', subject: 'en', grade: 6, semester: 1, level: 9,
    title: 'friends · 되고 싶은 것을 말하는 문장', point: '장래희망',
    items: ['I want to be a teacher like my friend.', 'My best friend wants to be a doctor.', 'She wants to be a cook when she grows up.', 'He hopes to be a great soccer player.', 'We want to be kind teachers someday.', 'My classmate wants to be an artist.', 'They hope to be good singers in the future.', 'You can be a writer if you like stories.', 'Her friend wants to be a police officer.', 'His dream is to be a good basketball player.'],
  },
  {
    id: 'e6-1-10', subject: 'en', grade: 6, semester: 1, level: 10,
    title: 'hobbies · 제안하고 답하는 문장', point: '제안하기',
    items: ['Let\'s play soccer after school.', 'How about drawing a picture together?', 'Why don\'t we read a book today?', 'Let\'s listen to music after dinner.', 'How about riding our bikes in the park?', 'Why don\'t we take some pictures outside?', 'Let\'s make a paper plane this afternoon.', 'How about playing the piano for fun?', 'Why don\'t we watch a movie at home?', 'Let\'s dance to this song together.'],
  },
  {
    id: 'e6-1-11', subject: 'en', grade: 6, semester: 1, level: 11,
    title: 'music · 무엇인지 설명하는 문장', point: '설명하기',
    items: ['A piano is an instrument with many keys.', 'A drum is an instrument you hit with your hands.', 'A guitar is an instrument with strings.', 'A song is music that people sing.', 'A singer is a person who sings songs.', 'A band is a group that plays music together.', 'A flute is an instrument you play by blowing.', 'A concert is a place to hear live music.', 'A note is a sign used to write music.', 'A violin is a small instrument with strings.'],
  },
  {
    id: 'e6-1-12', subject: 'en', grade: 6, semester: 1, level: 12,
    title: 'animals · 둘을 견주어 설명하는 문장', point: '비교대조',
    items: ['A tiger is bigger than a cat.', 'An elephant is heavier than a horse.', 'A rabbit is smaller than a dog.', 'A giraffe is taller than a zebra.', 'A turtle is slower than a mouse.', 'A cheetah is faster than a lion.', 'A whale is larger than a dolphin.', 'A snake is longer than a frog.', 'A monkey is smaller than a bear.', 'A horse can run faster than a cow.'],
  },
  {
    id: 'e6-1-13', subject: 'en', grade: 6, semester: 1, level: 13,
    title: 'home · 마음을 전하는 문장', point: '감정표현',
    items: ['I am happy to be home.', 'We feel safe in our house.', 'Mom is glad to see me.', 'Dad looks tired after work.', 'My sister feels sad today.', 'Home makes my heart warm.', 'I feel sorry about the mess.', 'Our family is excited tonight.', 'Grandma seems pleased with dinner.', 'My brother looks worried now.'],
  },
  {
    id: 'e6-1-14', subject: 'en', grade: 6, semester: 1, level: 14,
    title: 'nature · 두루 살펴 쓰는 문장', point: '종합',
    items: ['Look at the tall green tree.', 'A gentle wind blows across the hill.', 'Do you hear the river flow?', 'Small birds build a warm nest.', 'The bright sun warms the cold earth.', 'Many fish swim in the deep blue sea.', 'Leaves turn red during cool autumn.', 'Spring brings beautiful wild flowers.', 'Snow covers the silent high mountains.', 'We must protect our clean forest.'],
  },
  {
    id: 'e6-1-15', subject: 'en', grade: 6, semester: 1, level: 15,
    title: 'food · -tion 과 -sion 으로 끝나는 낱말', point: '-tion',
    items: ['selection', 'instruction', 'creation', 'production', 'celebration', 'preparation', 'collection', 'perfection', 'satisfaction', 'option'],
  },
  {
    id: 'e6-1-16', subject: 'en', grade: 6, semester: 1, level: 16,
    title: 'my town · un- 과 re- 가 붙은 낱말', point: '접두사',
    items: ['unable', 'unclear', 'unlucky', 'unready', 'unfriendly', 'unimportant', 'uncomfortable', 'rebuild', 'remake', 'restart'],
  },
  {
    id: 'e6-1-17', subject: 'en', grade: 6, semester: 1, level: 17,
    title: 'feelings · -ful 과 -less 가 붙은 낱말', point: '접미사',
    items: ['careful', 'careless', 'hopeful', 'hopeless', 'joyful', 'joyless', 'painful', 'painless', 'fearful', 'fearless'],
  },
  {
    id: 'e6-1-18', subject: 'en', grade: 6, semester: 1, level: 18,
    title: 'colors · 음절이 여럿인 긴 낱말', point: '긴낱말',
    items: ['yellow', 'orange', 'purple', 'silver', 'golden', 'colorful', 'bright', 'rainbow', 'violet', 'shining'],
  },
  {
    id: 'e6-1-19', subject: 'en', grade: 6, semester: 1, level: 19,
    title: 'travel · 모양이 바뀌는 지난 일 낱말', point: '불규칙과거',
    items: ['went', 'came', 'took', 'flew', 'rode', 'bought', 'left', 'spent', 'found', 'slept'],
  },
  {
    id: 'e6-1-20', subject: 'en', grade: 6, semester: 1, level: 20,
    title: 'daily life · 모양이 바뀌는 지난 일을 말하는 문장', point: '불규칙과거문장',
    items: ['I got up early this Sunday.', 'She ate delicious toast for breakfast.', 'He drank sweet milk with cookies.', 'We went to the quiet library together.', 'My brother read three comic books.', 'She rode a bicycle in the park.', 'They ran across the green field.', 'I wrote a secret letter to my friend.', 'Mom spoke kindly to our family.', 'The boy slept late on Saturday.'],
  },
  {
    id: 'e6-1-21', subject: 'en', grade: 6, semester: 1, level: 21,
    title: 'weather · 앞으로 할 일을 말하는 문장', point: 'will문장',
    items: ['It will rain this afternoon.', 'The sun will come out soon.', 'We will stay inside on a rainy day.', 'I will take my umbrella tomorrow.', 'The weather will be sunny this weekend.', 'My friend will wear a coat outside.', 'It will be cold in the morning.', 'We will play outside when it is warm.', 'I will wear my hat on a hot day.', 'The wind will be strong this evening.'],
  },
  {
    id: 'e6-1-22', subject: 'en', grade: 6, semester: 1, level: 22,
    title: 'the body · 하려고 하는 일을 말하는 문장', point: 'begoingto',
    items: ['I am going to wash my hands.', 'She is going to brush her teeth.', 'He is going to open his mouth.', 'We are going to close our eyes.', 'They are going to move their arms.', 'My sister is going to touch her nose.', 'The baby is going to lift one foot.', 'My mother is going to rest her back.', 'The child is going to turn his head.', 'Our teacher is going to point to her ears.'],
  },
  {
    id: 'e6-1-23', subject: 'en', grade: 6, semester: 1, level: 23,
    title: 'school · and·but·because 로 이은 문장', point: '이어주는말',
    items: ['We study hard because we have a test today.', 'The classroom is big but the library is small.', 'She has a pencil and he has an eraser.', 'Our class is busy because we have a project.', 'He likes math but his sister likes English.', 'The bell rings and the students go inside.', 'Lunch is ready but we must wait for our teacher.', 'They clean the room and put away their books.', 'You need paper because we will draw a picture.', 'The lesson is short but everyone learns a lot.'],
  },
  {
    id: 'e6-1-24', subject: 'en', grade: 6, semester: 1, level: 24,
    title: 'seasons · 되고 싶은 것을 말하는 문장', point: '장래희망',
    items: ['I want to be a farmer and work in spring.', 'My dream is to be a swimmer in summer.', 'She wants to be a weather reporter someday.', 'He hopes to be a park worker in the fall.', 'Winter makes me want to be a ski teacher.', 'In spring, I want to be a flower shop owner.', 'Summer makes her want to be a lifeguard.', 'In the fall, he wants to be a photographer.', 'Cold days make me want to be a baker.', 'Warm weather makes us want to be gardeners.'],
  },
  {
    id: 'e6-1-25', subject: 'en', grade: 6, semester: 1, level: 25,
    title: 'clothes · 제안하고 답하는 문장', point: '제안하기',
    items: ['Let\'s wear our new shirts today.', 'How about putting on this blue jacket?', 'Why don\'t you try the red dress?', 'Let\'s choose a hat for your brother.', 'How about wearing these black pants?', 'Why don\'t we buy a warm coat for winter?', 'Let\'s put on our socks before we go out.', 'How about trying this yellow skirt?', 'Why don\'t you wear your white shoes?', 'Let\'s find a clean sweater for your sister.'],
  },
  {
    id: 'e6-1-26', subject: 'en', grade: 6, semester: 1, level: 26,
    title: 'family · 무엇인지 설명하는 문장', point: '설명하기',
    items: ['A mother is a woman who has a child.', 'A father is a man who has a child.', 'A sister is a girl in your family.', 'A brother is a boy in your family.', 'A grandmother is the mother of your parent.', 'A grandfather is the father of your parent.', 'A baby is a very young child.', 'A daughter is a girl who is someone\'s child.', 'A son is a boy who is someone\'s child.', 'Children are the sons and daughters in a family.'],
  },
  {
    id: 'e6-1-27', subject: 'en', grade: 6, semester: 1, level: 27,
    title: 'sports · 둘을 견주어 설명하는 문장', point: '비교대조',
    items: ['Soccer is more popular than tennis in our class.', 'Basketball uses a bigger ball than baseball.', 'Running is easier for me than swimming.', 'Table tennis needs a smaller ball than golf.', 'Baseball games are longer than our soccer games.', 'Swimming is harder for me than skating.', 'Volleyball has a higher net than tennis.', 'Golf is slower for me than basketball.', 'Cycling feels faster than walking.', 'Skiing is more exciting for me than bowling.'],
  },
  {
    id: 'e6-1-28', subject: 'en', grade: 6, semester: 1, level: 28,
    title: 'toys · 마음을 전하는 문장', point: '감정표현',
    items: ['The new toy makes him joyful.', 'She is excited about her doll.', 'He feels proud of his train.', 'Playing with blocks is fun.', 'Her teddy bear makes her calm.', 'They are upset about the broken kite.', 'This ball makes you cheerful.', 'The puzzle makes my friend curious.', 'His car brings a big smile.', 'Those cards make children interested.'],
  },
  {
    id: 'e6-1-29', subject: 'en', grade: 6, semester: 1, level: 29,
    title: 'friends · 두루 살펴 쓰는 문장', point: '종합',
    items: ['She shares her sweet fruit with me.', 'My kind classmates always help each other.', 'Can you keep this little secret?', 'We play funny board games together.', 'They walked side by side after school.', 'I wrote a nice thank-you card for him.', 'Listening carefully shows true respect.', 'Who wants to join our jump rope team?', 'Good partners practice dancing every day.', 'Please cheer up when trouble comes.'],
  },
  {
    id: 'e6-2-01', subject: 'en', grade: 6, semester: 2, level: 1,
    title: 'school · quiet/quite 처럼 헷갈리는 낱말', point: '헷갈리는짝',
    items: ['quiet', 'quite', 'class', 'glass', 'desk', 'dish', 'pencil', 'person', 'board', 'bored'],
  },
  {
    id: 'e6-2-02', subject: 'en', grade: 6, semester: 2, level: 2,
    title: 'seasons · 두 낱말이 붙어 만들어진 낱말', point: '복합어',
    items: ['snowball', 'snowman', 'sunshine', 'raincoat', 'rainbow', 'waterfall', 'sunflower', 'snowflake', 'firefly', 'greenhouse'],
  },
  {
    id: 'e6-2-03', subject: 'en', grade: 6, semester: 2, level: 3,
    title: 'clothes · 철자를 자주 틀리는 긴 낱말', point: '자주틀리는말2',
    items: ['clothes', 'sweater', 'sneakers', 'jacket', 'trousers', 'uniform', 'pajamas', 'gloves', 'scarf', 'boots'],
  },
  {
    id: 'e6-2-04', subject: 'en', grade: 6, semester: 2, level: 4,
    title: 'family · -ly 가 붙어 만들어진 낱말', point: '부사ly',
    items: ['kindly', 'happily', 'sadly', 'quietly', 'loudly', 'carefully', 'easily', 'really', 'usually', 'slowly'],
  },
  {
    id: 'e6-2-05', subject: 'en', grade: 6, semester: 2, level: 5,
    title: 'sports · 큰 글자와 문장 부호를 갖춘 문장', point: '대문자부호',
    items: ['We play soccer after school.', 'Do you like baseball?', 'My team practices every Friday.', 'Can she play basketball well?', 'They run around the field.', 'Our coach has a new ball.', 'I enjoy swimming with my friends.', 'What sport do you like best?', 'He can jump very high!', 'The game starts on Saturday.'],
  },
  {
    id: 'e6-2-06', subject: 'en', grade: 6, semester: 2, level: 6,
    title: 'toys · 남의 말을 옮겨 적는 문장', point: '인용문장',
    items: ['Mina said, “I like this doll.”', 'Joon said, “My robot is new.”', 'Sora said, “This puzzle is fun.”', 'Jun said, “Can I use your top?”', 'Bora said, “Do you want this game?”', 'She said, “This doll is cute.”', 'He said, “My robot can walk.”', 'I said, “That ball is mine.”', 'Mom said, “Put the blocks away.”', 'Dad said, “The kite is very high.”'],
  },
  {
    id: 'e6-2-07', subject: 'en', grade: 6, semester: 2, level: 7,
    title: 'friends · 안내하고 설명하는 문장', point: '안내설명',
    items: ['Meet your friends by the gate.', 'Please wait for us after class.', 'Come to my house this afternoon.', 'Bring a snack for our picnic.', 'We can play games in the park.', 'Call me when you get home.', 'Share these cookies with your team.', 'Sit next to your best friend.', 'Join our club after school.', 'Help each other with this work.'],
  },
  {
    id: 'e6-2-08', subject: 'en', grade: 6, semester: 2, level: 8,
    title: 'hobbies · 고마움과 미안함을 전하는 문장', point: '감사사과',
    items: ['Thank you for playing chess with me.', 'I\'m sorry I lost your soccer ball.', 'Thanks for teaching me this song.', 'Thank you for reading my story.', 'Sorry, I forgot our dance practice.', 'Thanks for showing me how to swim.', 'I\'m sorry I missed the music club.', 'Thank you for taking my picture.', 'Sorry, I can\'t join the basketball game.', 'Thanks for helping with my drawing.'],
  },
  {
    id: 'e6-2-09', subject: 'en', grade: 6, semester: 2, level: 9,
    title: 'music · 초대하고 약속하는 문장', point: '초대약속',
    items: ['Would you like to hear my new song?', 'Come and sing with us after school.', 'Let\'s meet for band practice tomorrow.', 'Can you join our music club this Friday?', 'Please come to the piano show tonight.', 'How about playing the guitar together?', 'I promise to bring my drum next time.', 'We can listen to your favorite songs later.', 'Join me for a dance class this afternoon.', 'I\'ll practice the flute before our show.'],
  },
  {
    id: 'e6-2-10', subject: 'en', grade: 6, semester: 2, level: 10,
    title: 'animals · 어려움과 해결을 말하는 문장', point: '문제해결',
    items: ['The dog is hungry, so give it some food.', 'My cat is cold, so I put it inside.', 'This bird can\'t fly, so we should help it.', 'The rabbit is thirsty, so bring some water.', 'A fish looks sick, so tell an adult.', 'The horse is tired, so let it rest.', 'That duck is lost, so look for its home.', 'Our puppy is dirty, so wash it gently.', 'The turtle is in danger, so move it away.', 'A small frog is stuck, so set it free.'],
  },
  {
    id: 'e6-2-11', subject: 'en', grade: 6, semester: 2, level: 11,
    title: 'home · 이야기 속 문장', point: '이야기문장',
    items: ['My family ate dinner together.', 'Dad opened the window slowly.', 'Mom found a note by her bed.', 'Our puppy waited near the door.', 'Grandma baked bread that morning.', 'I heard a sound from upstairs.', 'Someone knocked before breakfast.', 'The kitchen light was still on.', 'A little bird flew into my room.', 'We looked for the missing key.'],
  },
  {
    id: 'e6-2-12', subject: 'en', grade: 6, semester: 2, level: 12,
    title: 'nature · 사람과 장소를 소개하는 문장', point: '소개문장',
    items: ['This is a peaceful forest with tall green trees.', 'Look at this deep lake between high mountains.', 'Here is a wide river where ducks swim together.', 'Meet the park ranger who protects wild animals.', 'That is our sunny campsite near the quiet ocean.', 'Welcome to the island that has lovely flowers.', 'This spot is a warm valley full of fresh fruit.', 'Come see the bright garden by the small hill.', 'That brave guide shows visitors around the cave.', 'Here is an open beach with clean yellow sand.'],
  },
  {
    id: 'e6-2-13', subject: 'en', grade: 6, semester: 2, level: 13,
    title: 'food · 생각을 말하는 문장', point: '의견말하기',
    items: ['I think warm vegetable soup is healthy.', 'In my opinion, sweet melon tastes delicious.', 'Eating fresh fruit every day is very important.', 'My view is that spicy noodles are too hot.', 'From my point of view, baking bread is fun.', 'To me, cold milk is better than sweet soda.', 'I feel that green salad makes a good lunch.', 'We should eat less salty food for our body.', 'It seems to me that breakfast gives us energy.', 'You might think fried chicken is too oily.'],
  },
  {
    id: 'e6-2-14', subject: 'en', grade: 6, semester: 2, level: 14,
    title: 'my town · 두 가지를 이어 붙인 긴 문장', point: '긴문장',
    items: ['Turn left at the bank and go straight.', 'There is a bakery, but it is closed today.', 'I like my neighborhood because it is quiet.', 'Go past the market and look for the library.', 'We visited the museum, and it was so big.', 'Walk two blocks, then you will see the post office.', 'Cross the busy street, but be very careful.', 'The park is nearby, so many children play there.', 'Where is the police station, and is it far away?', 'I stopped by the bookstore to buy some comic books.'],
  },
  {
    id: 'e6-2-15', subject: 'en', grade: 6, semester: 2, level: 15,
    title: 'feelings · 마무리 종합 문장', point: '종합',
    items: ['I feel happy today.', 'She was angry yesterday.', 'Are you bored now?', 'We feel proud of him.', 'He looks very tired.', 'They felt excited.', 'She is worried about it.', 'The boy was surprised.', 'I felt upset then.', 'Is he nervous now?'],
  },
  {
    id: 'e6-2-16', subject: 'en', grade: 6, semester: 2, level: 16,
    title: 'colors · quiet/quite 처럼 헷갈리는 낱말', point: '헷갈리는짝',
    items: ['black', 'block', 'brown', 'crown', 'gray', 'glue', 'green', 'greet', 'white', 'write'],
  },
  {
    id: 'e6-2-17', subject: 'en', grade: 6, semester: 2, level: 17,
    title: 'travel · 두 낱말이 붙어 만들어진 낱말', point: '복합어',
    items: ['airplane', 'backpack', 'railroad', 'passport', 'seaside', 'postcard', 'suitcase', 'highway', 'subway', 'airport'],
  },
  {
    id: 'e6-2-18', subject: 'en', grade: 6, semester: 2, level: 18,
    title: 'daily life · 철자를 자주 틀리는 긴 낱말', point: '자주틀리는말2',
    items: ['exercise', 'breakfast', 'homework', 'schedule', 'routine', 'calendar', 'practice', 'dinner', 'morning', 'evening'],
  },
  {
    id: 'e6-2-19', subject: 'en', grade: 6, semester: 2, level: 19,
    title: 'weather · -ly 가 붙어 만들어진 낱말', point: '부사ly',
    items: ['warmly', 'brightly', 'strongly', 'lightly', 'suddenly', 'gently', 'badly', 'finally', 'early', 'nearly'],
  },
  {
    id: 'e6-2-20', subject: 'en', grade: 6, semester: 2, level: 20,
    title: 'the body · 큰 글자와 문장 부호를 갖춘 문장', point: '대문자부호',
    items: ['My left hand feels cold.', 'Can you touch your toes?', 'She has long brown hair.', 'Please wash your hands well.', 'His right knee hurts today.', 'Do your eyes feel tired?', 'We use our ears to hear sounds.', 'Open your mouth and say ah.', 'Her face looks very happy.', 'I brush my teeth every morning.'],
  },
  {
    id: 'e6-2-21', subject: 'en', grade: 6, semester: 2, level: 21,
    title: 'school · 남의 말을 옮겨 적는 문장', point: '인용문장',
    items: ['Mina said, “I go to school early.”', 'Joon said, “Our classroom is clean.”', 'Sora said, “My book is on the desk.”', 'Jun said, “Where is the music room?”', 'Bora said, “Do you have an eraser?”', 'My teacher said, “Open your book.”', 'She said, “Please sit down.”', 'He asked, “Where is my pencil?”', 'My friend said, “This is my desk.”', 'The teacher said, “Write your name.”'],
  },
  {
    id: 'e6-2-22', subject: 'en', grade: 6, semester: 2, level: 22,
    title: 'seasons · 안내하고 설명하는 문장', point: '안내설명',
    items: ['Spring begins with warm days.', 'Summer weather is often hot.', 'Fall brings cool air and colorful leaves.', 'Winter nights can be very cold.', 'Flowers grow well during spring.', 'Wear light clothes on hot summer days.', 'Many leaves turn yellow in fall.', 'Put on a coat before going outside.', 'Snow may cover the ground in winter.', 'Enjoy fresh fruit during summer.'],
  },
  {
    id: 'e6-2-23', subject: 'en', grade: 6, semester: 2, level: 23,
    title: 'clothes · 고마움과 미안함을 전하는 문장', point: '감사사과',
    items: ['Thank you for finding my jacket.', 'I\'m sorry I took your hat by mistake.', 'Thanks for washing these socks.', 'I\'m sorry I got your shirt wet.', 'Thank you for lending me your coat.', 'Sorry, I forgot to bring your skirt.', 'Thanks for picking up my gloves.', 'I\'m sorry I stepped on your shoes.', 'Thank you for fixing this button.', 'Sorry, I can\'t find your blue pants.'],
  },
  {
    id: 'e6-2-24', subject: 'en', grade: 6, semester: 2, level: 24,
    title: 'family · 초대하고 약속하는 문장', point: '초대약속',
    items: ['Will you visit my family on Sunday?', 'Please have dinner with my parents.', 'How about coming to our house tomorrow?', 'Dad will take us to the park this weekend.', 'Mom says you can stay for lunch.', 'My sister wants to invite you home.', 'I\'ll help Grandma cook in the morning.', 'Can your brother come over after class?', 'Our family will meet at five o\'clock.', 'I promise to call Grandpa this evening.'],
  },
  {
    id: 'e6-2-25', subject: 'en', grade: 6, semester: 2, level: 25,
    title: 'sports · 어려움과 해결을 말하는 문장', point: '문제해결',
    items: ['I can\'t kick well, so I\'ll practice more.', 'My tennis ball is gone, so I\'ll get another.', 'We are losing, but let\'s keep trying.', 'He fell during soccer, so let him sit down.', 'She can\'t swim yet, so teach her slowly.', 'The bat is broken, so use a different one.', 'Our team is late, so let\'s run to the field.', 'I feel tired, so I\'ll take a short break.', 'The court is wet, so wait until it is dry.', 'My bike has a problem, so I\'ll walk today.'],
  },
  {
    id: 'e6-2-26', subject: 'en', grade: 6, semester: 2, level: 26,
    title: 'toys · 이야기 속 문장', point: '이야기문장',
    items: ['His robot walked across the floor.', 'She picked up a shiny ball.', 'That doll wore a pretty hat.', 'Three blocks fell off the table.', 'Ben pushed his toy car forward.', 'An old kite rose above the trees.', 'Two bears sat inside a small box.', 'Her train stopped beside the bridge.', 'This plane made a funny noise.', 'One puzzle piece could not be found.'],
  },
  {
    id: 'e6-2-27', subject: 'en', grade: 6, semester: 2, level: 27,
    title: 'friends · 사람과 장소를 소개하는 문장', point: '소개문장',
    items: ['Meet my kind classmate who always helps others.', 'This is our classroom where we study science.', 'Here is the library where friends read stories.', 'She is my best friend from the art club.', 'Welcome to our playground beside the big gym.', 'Look at this computer room where partners talk.', 'Meet Bora, who shares her cute notebooks happily.', 'This quiet place is our favorite school bench.', 'He is an honest leader who listens to everyone.', 'Come see our colorful art room down the hall.'],
  },
  {
    id: 'e6-2-28', subject: 'en', grade: 6, semester: 2, level: 28,
    title: 'hobbies · 생각을 말하는 문장', point: '의견말하기',
    items: ['I think taking photos of cats is exciting.', 'In my view, swimming after school builds power.', 'Learning guitar seems quite challenging to me.', 'My thought is that dancing keeps us cheerful.', 'To my mind, riding a bicycle feels wonderful.', 'I believe playing board games brings great joy.', 'Camping with family can be a fantastic hobby.', 'It feels like flying kites brings peaceful rest.', 'You will find that planting seeds teaches care.', 'Collecting coins appears very interesting.'],
  },
  {
    id: 'e6-2-29', subject: 'en', grade: 6, semester: 2, level: 29,
    title: 'music · 두 가지를 이어 붙인 긴 문장', point: '긴문장',
    items: ['She can sing very well, and she plays the piano.', 'I wanted to join the band, but I was nervous.', 'Listen to this cheerful sound and tap your feet.', 'We practiced together because the concert is soon.', 'Do you like classical music, or do you prefer rock?', 'The flute is small, but it makes a sweet melody.', 'They formed a team, and everyone played the drums.', 'Sing the whole song loudly, and smile at people.', 'I enjoy quiet jazz, while my sister loves pop songs.', 'He plays the violin every day to prepare for it.'],
  },
  {
    id: 'e6-2-30', subject: 'en', grade: 6, semester: 2, level: 30,
    title: 'animals · 마무리 종합 문장', point: '종합',
    items: ['The bear runs fast.', 'A monkey climbs high.', 'Dolphins swim well.', 'Look at the tall giraffe.', 'Elephants have long trunks.', 'Tigers live in forests.', 'The cute rabbit hops.', 'Whales are very large.', 'A zebra eats green grass.', 'Penguins cannot fly.'],
  },
];
