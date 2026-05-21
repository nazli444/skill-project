#!/bin/bash


echo "=========================================="
echo "JDK Version: $(java -version 2>&1 | head -n 1)"
echo "macOS Version: $(sw_vers -productVersion)"
echo ""

if ! java -version 2>&1 | grep -q "1\.[89]\|1[0-9]\|2[0-9]"; then
    echo "JDK 8 or higher not found. Please ensure JDK 8+ is installed and set as JAVA_HOME"
    echo "You can check your Java version with: java -version"
    exit 1
fi


export JVM_ARGS="
-Xmx1024m
-Xms512m
"

echo "Building project..."
if command -v mvn &> /dev/null; then
    mvn clean compile -q
    if [ $? -ne 0 ]; then
        echo "Build failed. Please check for compilation errors."
        exit 1
    fi
else
    echo "Maven not found. Please install Maven."
    echo "You can install it with: brew install maven (on Mac)"
    exit 1
fi

echo "Build successful"

echo "Starting Spring Boot application on port 8080..."
echo "API will be available at: http://localhost:8080"
echo "H2 Console available at: http://localhost:8080/h2-console"
echo "=========================================="

mvn spring-boot:run -Dspring-boot.run.jvmArguments="$JVM_ARGS"
