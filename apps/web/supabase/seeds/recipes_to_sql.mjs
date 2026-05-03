#!/usr/bin/env node
// 1회용 변환 스크립트: recipes_100.csv + recipe_ingredients_100.csv → 0012_recipes_seed.sql
//
// 사용:
//   node apps/web/supabase/seeds/recipes_to_sql.mjs
//
// 출력: apps/web/supabase/migrations/0012_recipes_seed.sql (덮어쓰기)
//
// 동작:
//   1. CSV 두 개 파싱 (의존성 없는 자체 quoted-CSV parser)
//   2. ingredient_master 시드 (0006) 의 154 글로벌 row와 매칭 검증 — 누락 시 throw
//   3. recipe_master INSERT 100건 (단순 VALUES + safe single-quote escape)
//   4. recipe_ingredients INSERT (SUBSELECT 기반 lookup — recipe.name, ingredient_master.name)
//   5. 검증 코멘트 (예상 row count) 포함
//
// 멱등성: 출력 파일 덮어쓰기. 시드 마이그레이션은 0011 적용 후 한 번만 실행 가정.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

// ─────────── 경로 ───────────
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEEDS_DIR = __dirname;
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const RECIPES_CSV = path.join(SEEDS_DIR, 'recipes_100.csv');
const INGREDIENTS_CSV = path.join(SEEDS_DIR, 'recipe_ingredients_100.csv');
const OUTPUT_SQL = path.join(MIGRATIONS_DIR, '0012_recipes_seed.sql');

// ─────────── 0006 시드의 글로벌 ingredient_master 154개 (user_id IS NULL) ───────────
// 변경 시 0006_ingredient_master_seed.sql과 동기화 필요.
const VALID_INGREDIENTS = new Set([
  // 육류 14
  '소고기 등심', '소고기 안심', '소고기 양지', '소고기 다짐육',
  '돼지고기 삼겹살', '돼지고기 목살', '돼지고기 등심', '돼지고기 다짐육',
  '닭가슴살', '닭다리', '닭날개', '닭고기 통닭', '베이컨', '소갈비',
  // 해산물 14
  '고등어', '갈치', '연어', '명태', '오징어', '낙지', '새우', '조개',
  '홍합', '전복', '굴', '멸치', '김', '미역',
  // 채소 32
  '대파', '쪽파', '양파', '마늘', '생강', '감자', '고구마', '당근',
  '배추', '양배추', '상추', '깻잎', '시금치', '미나리', '부추', '청경채',
  '오이', '애호박', '가지', '파프리카', '피망', '고추', '청양고추', '토마토',
  '방울토마토', '버섯 표고', '버섯 느타리', '버섯 새송이', '버섯 팽이',
  '숙주', '콩나물', '무',
  // 과일 18
  '사과', '배', '귤', '오렌지', '레몬', '바나나', '포도', '딸기',
  '블루베리', '수박', '참외', '복숭아', '자두', '체리', '망고',
  '파인애플', '키위', '아보카도',
  // 유제품 10
  '우유', '저지방 우유', '치즈 슬라이스', '체다 치즈', '모짜렐라 치즈',
  '요거트', '그릭 요거트', '버터', '생크림', '연유',
  // 곡물 12
  '쌀', '현미', '잡곡', '찹쌀', '밀가루', '부침가루', '빵', '식빵',
  '우동면', '소면', '스파게티', '떡',
  // 조미료 18
  '간장', '진간장', '국간장', '된장', '고추장', '쌈장', '소금', '설탕',
  '후추', '식초', '맛술', '참기름', '들기름', '식용유', '올리브오일',
  '고춧가루', '마늘 다진것', '생강 다진것',
  // 가공식품 14
  '라면', '컵라면', '만두', '어묵', '소시지', '햄', '스팸',
  '참치 통조림', '꽁치 통조림', '옥수수 통조림', '두부', '순두부',
  '계란', '맛김',
  // 음료 8
  '생수', '탄산수', '콜라', '사이다', '오렌지 주스', '포도 주스',
  '맥주', '소주',
  // 간식 6
  '초콜릿', '과자', '아이스크림', '견과류 믹스', '아몬드', '호두',
  // 김치/장류 6
  '배추김치', '총각김치', '깍두기', '파김치', '열무김치', '동치미',
  // 기타 2
  '도시락', '남은 음식',
]);

// ─────────── 자체 CSV parser (큰따옴표 wrap + "" escape 지원) ───────────
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          // escaped quote
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cur += c;
      i++;
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
      } else if (c === ',') {
        row.push(cur);
        cur = '';
        i++;
      } else if (c === '\n') {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
        i++;
      } else if (c === '\r') {
        // ignore CR
        i++;
      } else {
        cur += c;
        i++;
      }
    }
  }
  // last field
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  // strip trailing empty rows
  while (rows.length > 0 && rows[rows.length - 1].every((f) => f === '')) {
    rows.pop();
  }
  return rows;
}

// ─────────── SQL 안전 single-quote escape ───────────
function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function sqlNumber(value) {
  if (value === '' || value === null || value === undefined) return 'NULL';
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }
  return String(n);
}

function sqlBool(value) {
  const v = String(value).trim().toLowerCase();
  if (v === 'true') return 'true';
  if (v === 'false') return 'false';
  throw new Error(`Invalid boolean value: ${value}`);
}

function sqlDifficulty(value) {
  const v = String(value).trim().toLowerCase();
  if (!['easy', 'medium', 'hard'].includes(v)) {
    throw new Error(`Invalid difficulty: ${value}`);
  }
  return `'${v}'::recipe_difficulty`;
}

// ─────────── 메인 ───────────
function main() {
  // 1) recipes_100.csv 파싱
  const recipesRaw = fs.readFileSync(RECIPES_CSV, 'utf8');
  const recipesRows = parseCsv(recipesRaw);
  const recipesHeader = recipesRows.shift();
  const expectedRecipeHeader = ['name', 'description', 'cook_minutes', 'difficulty', 'servings', 'instructions_md'];
  if (recipesHeader.join(',') !== expectedRecipeHeader.join(',')) {
    throw new Error(`recipes_100.csv 헤더 불일치: ${recipesHeader.join(',')}`);
  }
  if (recipesRows.length !== 100) {
    throw new Error(`recipes_100.csv는 정확히 100 row여야 합니다. 현재: ${recipesRows.length}`);
  }

  const recipeNameSet = new Set();
  for (const r of recipesRows) {
    if (recipeNameSet.has(r[0])) {
      throw new Error(`recipe name 중복: ${r[0]}`);
    }
    recipeNameSet.add(r[0]);
  }

  // 2) recipe_ingredients_100.csv 파싱
  const ingrRaw = fs.readFileSync(INGREDIENTS_CSV, 'utf8');
  const ingrRows = parseCsv(ingrRaw);
  const ingrHeader = ingrRows.shift();
  const expectedIngrHeader = ['recipe_name', 'ingredient_name', 'quantity', 'unit', 'is_optional'];
  if (ingrHeader.join(',') !== expectedIngrHeader.join(',')) {
    throw new Error(`recipe_ingredients_100.csv 헤더 불일치: ${ingrHeader.join(',')}`);
  }

  // 3) Validation
  const errors = [];
  const seenPairs = new Set();
  for (const [idx, row] of ingrRows.entries()) {
    const [recipeName, ingName, qty, unit, optStr] = row;
    if (!recipeNameSet.has(recipeName)) {
      errors.push(`row ${idx + 2}: recipe '${recipeName}' is not in recipes_100.csv`);
    }
    if (!VALID_INGREDIENTS.has(ingName)) {
      errors.push(`row ${idx + 2}: ingredient '${ingName}' is not in 0006 ingredient_master seed`);
    }
    const pairKey = `${recipeName}||${ingName}`;
    if (seenPairs.has(pairKey)) {
      errors.push(`row ${idx + 2}: duplicate (recipe, ingredient) pair: ${pairKey}`);
    }
    seenPairs.add(pairKey);
    if (optStr !== 'true' && optStr !== 'false') {
      errors.push(`row ${idx + 2}: invalid is_optional value: '${optStr}'`);
    }
  }
  if (errors.length > 0) {
    console.error('VALIDATION ERRORS:');
    errors.slice(0, 50).forEach((e) => console.error(' -', e));
    if (errors.length > 50) console.error(` ...and ${errors.length - 50} more`);
    throw new Error(`Validation failed with ${errors.length} errors`);
  }

  // 4) recipe_master INSERT 생성
  const recipeInserts = [];
  recipeInserts.push(
    'INSERT INTO recipe_master (name, description, cook_minutes, difficulty, servings, instructions_md) VALUES'
  );
  const recipeValues = recipesRows.map((r) => {
    const [name, description, cook, diff, servings, instr] = r;
    return `  (${sqlString(name)}, ${sqlString(description)}, ${sqlNumber(cook)}, ${sqlDifficulty(diff)}, ${sqlNumber(servings)}, ${sqlString(instr)})`;
  });
  recipeInserts.push(recipeValues.join(',\n') + ';');

  // 5) recipe_ingredients INSERT 생성 (SELECT 기반 lookup)
  const ingrInserts = [
    '-- recipe_ingredients: ingredient_master.user_id IS NULL 조건으로 글로벌 시드만 매칭',
    'INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, quantity, unit, is_optional)',
    'SELECT r.id, im.id, v.quantity, v.unit, v.is_optional',
    'FROM (VALUES',
  ];
  const ingrValues = ingrRows.map((row) => {
    const [recipeName, ingName, qty, unit, optStr] = row;
    return `  (${sqlString(recipeName)}, ${sqlString(ingName)}, ${sqlNumber(qty)}::numeric(10,2), ${sqlString(unit)}, ${sqlBool(optStr)})`;
  });
  ingrInserts.push(ingrValues.join(',\n'));
  ingrInserts.push(') AS v(recipe_name, ingredient_name, quantity, unit, is_optional)');
  ingrInserts.push('JOIN recipe_master r ON r.name = v.recipe_name');
  ingrInserts.push('JOIN ingredient_master im ON im.name = v.ingredient_name AND im.user_id IS NULL;');

  // 6) 헤더 + 본문 + 검증 코멘트
  const header = `-- ─────────────────────────────────────────────────────────────
-- 0012_recipes_seed.sql
-- ─────────────────────────────────────────────────────────────
-- DO NOT EDIT — regenerate via:
--   node apps/web/supabase/seeds/recipes_to_sql.mjs
--
-- 큐레이션 가이드 (apps/web/supabase/seeds/recipes_100.csv):
--   - 100선 큐레이션 (한식 30 / 양식 20 / 중식 10 / 일식 11 / 분식 11 / 디저트 10 / 기타 8)
--   - difficulty: easy 50 / medium 40 / hard 10
--   - cook_minutes: <=30분 53 / 31-60분 43 / >60분 4
--   - 평균 약 6 재료/레시피 (필수 5-8 + 선택 0-4)
--   - 50% 이상이 마트 가공식품 + 흔한 식재료 조합으로 가능
--   - 모든 ingredient_name은 0006_ingredient_master_seed.sql의 154개 글로벌 시드(user_id IS NULL)와 정확히 매칭
--
-- 의존성: 0011_recipes.sql (recipe_master, recipe_ingredients, recipe_difficulty enum),
--         0005_ingredient_master.sql, 0006_ingredient_master_seed.sql
--
-- 검증: pnpm web db:reset 후
--   select count(*) from recipe_master;          -- 기대값: 100
--   select count(*) from recipe_ingredients;     -- 기대값: ${ingrRows.length}
-- ─────────────────────────────────────────────────────────────

`;

  const body =
    header +
    recipeInserts.join('\n') +
    '\n\n' +
    ingrInserts.join('\n') +
    `\n\n-- 예상 row count: recipe_master = 100, recipe_ingredients = ${ingrRows.length}\n`;

  fs.writeFileSync(OUTPUT_SQL, body, 'utf8');

  // 7) 콘솔 보고
  const stats = fs.statSync(OUTPUT_SQL);
  console.log('=== recipes_to_sql.mjs OK ===');
  console.log('Output:', OUTPUT_SQL);
  console.log('Bytes:', stats.size);
  console.log('Recipe count:', recipesRows.length);
  console.log('Ingredient row count:', ingrRows.length);
  console.log('Average ingredients per recipe:', (ingrRows.length / recipesRows.length).toFixed(2));
}

try {
  main();
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
}
