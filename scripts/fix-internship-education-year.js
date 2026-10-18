/*
  Fix script: Reassign internships (Staj) to the correct education year.
  - Default behavior: DRY RUN (no mutations). Pass --apply to execute updates.
  - Logic:
    1) Find active education year (AY) and previous non-active education year (PY) by startDate < AY.startDate, latest one.
    2) Any internships with startDate < AY.startDate but educationYearId === AY.id will be reassigned to PY.id.
    3) Any internships with NULL educationYearId (if exists) will be assigned to PY.id.

  Usage:
    node scripts/fix-internship-education-year.js           # dry-run
    node scripts/fix-internship-education-year.js --apply   # perform updates
*/

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({ log: ['warn', 'error'] })

function hasFlag(name) {
  return process.argv.includes(name)
}

async function main() {
  const APPLY = hasFlag('--apply')
  console.log(`\n🔧 Internship Education Year Fixer (mode: ${APPLY ? 'APPLY' : 'DRY-RUN'})`)

  await prisma.$connect()

  const active = await prisma.egitimYili.findFirst({ where: { active: true } })
  if (!active) {
    console.error('❌ No active education year found. Abort.')
    process.exit(1)
  }

  const previous = await prisma.egitimYili.findFirst({
    where: {
      active: false,
      startDate: active.startDate ? { lt: active.startDate } : undefined
    },
    orderBy: { startDate: 'desc' }
  })

  if (!previous) {
    console.warn('⚠️ No previous non-active education year found. Nothing to fix.')
    return
  }

  console.log(`Active: ${active.year} (${active.id}) start=${active.startDate || 'N/A'}`)
  console.log(`Prev  : ${previous.year} (${previous.id}) start=${previous.startDate || 'N/A'}`)

  // 1) Candidates with startDate < active.startDate but linked to active year
  const mislinked = await prisma.staj.findMany({
    where: {
      educationYearId: active.id,
      ...(active.startDate ? { startDate: { lt: active.startDate } } : {})
    },
    select: { id: true, studentId: true, companyId: true, startDate: true, educationYearId: true }
  })

  console.log(`\nFound ${mislinked.length} mislinked internships (assigned to active but started before it).`)

  if (!APPLY) {
    if (mislinked.length) {
      console.table(mislinked.map(x => ({ id: x.id, startDate: x.startDate, from: x.educationYearId, to: previous.id })))
    }
    console.log('\nDRY-RUN complete. Re-run with --apply to execute fixes.')
    return
  }

  // Apply updates in batches
  let updates = 0
  for (const item of mislinked) {
    await prisma.staj.update({
      where: { id: item.id },
      data: { educationYearId: previous.id, lastModifiedAt: new Date() }
    })
    updates++
  }

  console.log(`\n✅ Updates applied: ${updates}.`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
