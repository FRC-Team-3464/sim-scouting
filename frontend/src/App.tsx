import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import MatchForm from "./pages/MatchForm";
import Footer from "./components/Footer";
import LocalStorageView from "./pages/LocalStored";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import PitScoutingForm from "./pages/pitScoutingForm";
import { AuthenticationProvider } from "./auth/AuthenticationProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { FreshSessionRoute } from "./auth/FreshSessionRoute";

function App() {
    return (
        <BrowserRouter>
            <AuthenticationProvider>
                {/* Make flex column for sticky footer */}
                <div className="flex min-h-screen flex-col w-full">
                    {/* Main content grows to fill screen */}
                    <div className="flex grow justify-center mb-10">
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/signup" element={<SignupPage />} />
                            <Route element={<ProtectedRoute />}>
                                <Route path="/" element={<Home />} />
                                <Route
                                    path="/stored"
                                    element={<LocalStorageView />}
                                />
                                <Route element={<FreshSessionRoute />}>
                                    <Route
                                        path="/match"
                                        element={<MatchForm />}
                                    />
                                    <Route
                                        path="/pitScouting"
                                        element={<PitScoutingForm />}
                                    />
                                </Route>
                            </Route>
                        </Routes>
                    </div>
                    {/* Footer always at bottom */}
                    <Footer />
                </div>
            </AuthenticationProvider>
        </BrowserRouter>
    );
}

export default App;
