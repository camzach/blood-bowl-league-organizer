import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { App } from './app';
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient();

const rootDiv = document.querySelector('#root');
if (!rootDiv) {
  document.write('Failed to mount React app');
} else {
  const root = createRoot(rootDiv);
  root.render((
    <QueryClientProvider client={queryClient}>
      <Router>
        <App />
      </Router>
    </QueryClientProvider>
  ));
}
