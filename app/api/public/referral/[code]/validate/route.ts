import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getReferrerEligibility } from '@/lib/referrals/eligibility'
import { normalizeReferralCode } from '@/lib/referrals/codes'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Valida un código de referido sin exponer datos del referente. */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip =
      forwarded?.split(',').map((v) => v.trim()).filter(Boolean).pop() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const { allowed } = await rateLimit({
      maxRequests: 60,
      windowMs: 60 * 1000,
      identifier: `referral-validate:${ip}`,
    })
    if (!allowed) {
      return NextResponse.json({ valid: false }, { status: 429 })
    }

    const code = normalizeReferralCode(params.code)
    if (!code) return NextResponse.json({ valid: false })

    const client = await prisma.client.findUnique({
      where: { referralCode: code },
      select: { id: true },
    })
    if (!client) return NextResponse.json({ valid: false })

    const eligibility = await getReferrerEligibility(client.id)
    return NextResponse.json({ valid: eligibility.eligible })
  } catch (error) {
    console.error('Error validando código de referido:', error)
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}
