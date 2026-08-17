import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function Signup() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/pricing');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Get Started with NextSlot</CardTitle>
          <CardDescription>
            Choose a plan and start your free trial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground text-center">
            <p>
              Already have an account?{' '}
              <a
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                Log in
              </a>
            </p>
          </div>

          <Button onClick={handleGetStarted} className="w-full" size="lg">
            View Plans & Start Free Trial
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            No payment required • 14-day free trial • Cancel anytime
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
