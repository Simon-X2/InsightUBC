export const dynamic = 'force-dynamic' // defaults to auto
export async function GET(
    request: Request,
    { params }: { params: { slug: string } }
) {
    const data = params.slug
    return Response.json({ data })
}