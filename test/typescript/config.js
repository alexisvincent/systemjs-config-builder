SystemJS.config({
    transpiler: 'plugin-typescript',
    typescriptOptions: {
        module: "system",
        noImplicitAny: true,
        typeCheck: true,
        tsconfig: true
    }
});