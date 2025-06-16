import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Database, Key, Globe } from "lucide-react"

export function SetupInstructions() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Welcome to Next.js + Supabase Auth</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Follow these steps to set up your Supabase authentication
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Step 1: Create a Supabase Project
              </CardTitle>
              <CardDescription>
                Create a new Supabase project to get your database and authentication set up
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  Go to{" "}
                  <a
                    href="https://database.new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    database.new
                  </a>
                </li>
                <li>Sign up or log in to your Supabase account</li>
                <li>Create a new project</li>
                <li>Wait for the project to be set up (this may take a few minutes)</li>
              </ol>
              <Button asChild className="mt-4">
                <a href="https://database.new" target="_blank" rel="noopener noreferrer">
                  Create Supabase Project
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="mr-2 h-5 w-5" />
                Step 2: Get Your API Keys
              </CardTitle>
              <CardDescription>Copy your project URL and anon key from the Supabase dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>In your Supabase project dashboard, go to Settings → API</li>
                <li>Copy the "Project URL"</li>
                <li>Copy the "anon public" key</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                Step 3: Set Environment Variables
              </CardTitle>
              <CardDescription>Add your Supabase credentials to your environment variables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm">
                  Create or update your{" "}
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">.env.local</code> file with:
                </p>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <pre className="text-sm">
                    {`NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}
                  </pre>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Replace <code>your-project-url</code> and <code>your-anon-key</code> with the values from your
                  Supabase dashboard.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 4: Restart Your Development Server</CardTitle>
              <CardDescription>
                Restart your Next.js development server to load the new environment variables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <pre className="text-sm">npm run dev</pre>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Once you've completed these steps, refresh this page to start using the authentication system.
          </p>
        </div>
      </div>
    </div>
  )
}
